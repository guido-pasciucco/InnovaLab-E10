import { parse } from "libpg-query";

import { ANALYST_SCHEMA, ANALYST_VIEWS } from "./views";

// Validates the SQL the chat agent writes before it reaches the database.
//
// It parses the text with the real PostgreSQL parser (libpg-query, the same
// grammar the server uses) and walks the whole syntax tree with an ALLOW list:
// any construct, function, operator, type or relation not named below is
// rejected. A block list would miss whatever Postgres adds or we forget.
//
// This is one layer. The database still enforces the rest: the role
// `analyst_reader` can only read the `analyst` views, each view filters by the
// session user, and the executor runs a READ ONLY transaction with a timeout.
// This layer exists because the role inherits open grants from Postgres
// (extension functions, `set_config`) that a view cannot close.
//
// Reasons are written in Spanish and for the model: they say what to change.

export const ANALYST_SQL_MAX_LENGTH = 4000;

export type SqlGuardResult = { ok: true; sql: string } | { ok: false; reason: string };

// Syntax tree node kinds that may appear. Everything else (INSERT, UPDATE,
// function calls in FROM, arrays, row constructors, parameters, ...) is denied.
const ALLOWED_NODES = new Set([
  "SelectStmt",
  "ResTarget",
  "ColumnRef",
  "A_Star",
  "A_Const",
  "A_Expr",
  "String",
  "Integer",
  "Float",
  "Boolean",
  "BoolExpr",
  "NullTest",
  "BooleanTest",
  "CaseExpr",
  "CaseWhen",
  "CoalesceExpr",
  "MinMaxExpr",
  "FuncCall",
  "TypeCast",
  "TypeName",
  "RangeVar",
  "RangeSubselect",
  "JoinExpr",
  "SortBy",
  "SubLink",
  "List",
  "SQLValueFunction",
  "WindowDef",
]);

const ALLOWED_FUNCTIONS = new Set([
  // Aggregates
  "count",
  "sum",
  "avg",
  "min",
  "max",
  "stddev",
  "stddev_pop",
  "stddev_samp",
  "variance",
  "var_pop",
  "var_samp",
  "bool_and",
  "bool_or",
  "percentile_cont",
  "percentile_disc",
  // Numbers
  "round",
  "ceil",
  "ceiling",
  "floor",
  "trunc",
  "abs",
  "sign",
  "power",
  "sqrt",
  "mod",
  "ln",
  "log",
  "width_bucket",
  // Dates
  "date_trunc",
  "date_part",
  "extract",
  "age",
  "now",
  "make_date",
  "to_char",
  // Text
  "lower",
  "upper",
  "initcap",
  "length",
  "char_length",
  "concat",
  "substring",
  "btrim",
  "ltrim",
  "rtrim",
  "replace",
  "left",
  "right",
  "position",
  "like_escape",
  // Windows
  "row_number",
  "rank",
  "dense_rank",
  "percent_rank",
  "cume_dist",
  "ntile",
  "lag",
  "lead",
  "first_value",
  "last_value",
  "nth_value",
]);

const ALLOWED_OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
  "=",
  "<>",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "||",
  "~~",
  "!~~",
  "~~*",
  "!~~*",
  "~",
  "!~",
  "~*",
  "!~*",
  "BETWEEN",
  "NOT BETWEEN",
  "BETWEEN SYMMETRIC",
  "NOT BETWEEN SYMMETRIC",
]);

const ALLOWED_EXPRESSION_KINDS = new Set([
  "AEXPR_OP",
  "AEXPR_DISTINCT",
  "AEXPR_NOT_DISTINCT",
  "AEXPR_NULLIF",
  "AEXPR_IN",
  "AEXPR_LIKE",
  "AEXPR_ILIKE",
  "AEXPR_BETWEEN",
  "AEXPR_NOT_BETWEEN",
  "AEXPR_BETWEEN_SYM",
  "AEXPR_NOT_BETWEEN_SYM",
]);

// Postgres internal names (`int` is int4, `double precision` is float8, ...).
// Types such as regclass, regproc or xml are left out on purpose.
const ALLOWED_TYPES = new Set([
  "int2",
  "int4",
  "int8",
  "numeric",
  "float4",
  "float8",
  "text",
  "varchar",
  "bpchar",
  "bool",
  "date",
  "time",
  "timestamp",
  "timestamptz",
  "interval",
]);

// current_user, session_user, current_schema and the like are not here.
const ALLOWED_VALUE_FUNCTIONS = new Set([
  "SVFOP_CURRENT_DATE",
  "SVFOP_CURRENT_TIME",
  "SVFOP_CURRENT_TIMESTAMP",
  "SVFOP_LOCALTIME",
  "SVFOP_LOCALTIMESTAMP",
]);

const ALLOWED_SUBLINKS = new Set(["EXISTS_SUBLINK", "ANY_SUBLINK", "EXPR_SUBLINK", "ALL_SUBLINK"]);
const ALLOWED_SET_OPERATIONS = new Set(["SETOP_NONE", "SETOP_UNION", "SETOP_INTERSECT", "SETOP_EXCEPT"]);

const VIEW_NAMES = new Set<string>(ANALYST_VIEWS);
const AVAILABLE_VIEWS = ANALYST_VIEWS.map((view) => `${ANALYST_SCHEMA}.${view}`).join(", ");

type Scope = ReadonlySet<string>;
type Json = Record<string, unknown>;

class Rejection extends Error {}

function reject(reason: string): never {
  throw new Rejection(reason);
}

export async function validateAnalystSql(input: string): Promise<SqlGuardResult> {
  const text = input.trim();
  if (text === "") return fail("La consulta está vacía.");
  if (text.length > ANALYST_SQL_MAX_LENGTH) {
    return fail(`La consulta es demasiado larga (máximo ${ANALYST_SQL_MAX_LENGTH} caracteres).`);
  }

  let statements: { stmt?: unknown; stmt_location?: number; stmt_len?: number }[];
  try {
    statements = (await parse(text)).stmts ?? [];
  } catch (error) {
    return fail(`SQL inválido: ${error instanceof Error ? error.message : "no se pudo leer la consulta"}.`);
  }
  if (statements.length === 0) return fail("La consulta está vacía (solo tiene comentarios).");
  if (statements.length > 1) return fail("Se permite una sola sentencia por consulta.");

  const [statement] = statements;
  try {
    if (!isRecord(statement.stmt) || nodeKind(statement.stmt) !== "SelectStmt") {
      reject("Solo se permiten consultas SELECT (o WITH ... SELECT).");
    }
    walkValue(statement.stmt, new Set());
  } catch (error) {
    if (error instanceof Rejection) return fail(error.message);
    throw error;
  }

  return { ok: true, sql: statementText(text, statement) };
}

function fail(reason: string): SqlGuardResult {
  return { ok: false, reason };
}

// stmt_location and stmt_len are BYTE offsets into the UTF-8 text, so accents
// and ñ would shift a plain string slice. The statement is returned without
// the trailing semicolon, ready for the executor to wrap it.
function statementText(text: string, statement: { stmt_location?: number; stmt_len?: number }): string {
  const bytes = Buffer.from(text, "utf8");
  const start = statement.stmt_location ?? 0;
  const end = statement.stmt_len ? start + statement.stmt_len : bytes.length;
  return bytes.subarray(start, end).toString("utf8").trim();
}

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A node is an object with one key that starts with a capital letter, like
// { FuncCall: { ... } }. Plain structures (withClause, alias, A_Const values)
// use lower-case keys.
function nodeKind(value: Json): string | null {
  const keys = Object.keys(value);
  if (keys.length !== 1 || !/^[A-Z]/.test(keys[0]) || !isRecord(value[keys[0]])) return null;
  return keys[0];
}

function walkValue(value: unknown, scope: Scope): void {
  if (Array.isArray(value)) {
    for (const item of value) walkValue(item, scope);
    return;
  }
  if (!isRecord(value)) return;

  const kind = nodeKind(value);
  if (kind === null) {
    walkFields(value, scope);
    return;
  }
  walkNode(kind, value[kind] as Json, scope);
}

function walkFields(body: Json, scope: Scope): void {
  for (const [key, value] of Object.entries(body)) {
    // `typeName` and `operName` are plain structures, not wrapped nodes.
    if (key === "typeName" && isRecord(value)) checkType(value);
    if (key === "operName") checkOperators(value);
    walkValue(value, scope);
  }
}

function walkNode(kind: string, body: Json, scope: Scope): void {
  if (!ALLOWED_NODES.has(kind)) {
    reject(`No se permite esta construcción de SQL (${kind}). Usá solo SELECT sobre las vistas de ${ANALYST_SCHEMA}.`);
  }

  switch (kind) {
    case "SelectStmt":
      walkSelect(body, scope);
      return;
    case "RangeVar":
      checkRelation(body, scope);
      break;
    case "FuncCall":
      checkFunction(body);
      break;
    case "A_Expr":
      checkExpression(body);
      break;
    case "TypeName":
      checkType(body);
      break;
    case "SQLValueFunction":
      if (!ALLOWED_VALUE_FUNCTIONS.has(String(body.op))) {
        reject("Solo se permiten CURRENT_DATE, CURRENT_TIME, CURRENT_TIMESTAMP, LOCALTIME y LOCALTIMESTAMP.");
      }
      break;
    case "SubLink":
      if (!ALLOWED_SUBLINKS.has(String(body.subLinkType))) reject("No se permite este tipo de subconsulta.");
      break;
  }
  walkFields(body, scope);
}

// A WITH name only exists inside the statement that defines it. Tracking that
// scope matters: an unqualified name that is not a CTE in scope resolves to
// pg_catalog (it is searched first), so `select * from pg_roles` must fail even
// if another subquery happens to define a CTE with that name.
function walkSelect(body: Json, parentScope: Scope): void {
  if (body.intoClause !== undefined) reject("No se permite SELECT ... INTO.");
  if (body.lockingClause !== undefined) reject("No se permite FOR UPDATE ni FOR SHARE.");
  if (!ALLOWED_SET_OPERATIONS.has(String(body.op))) reject("No se permite esta operación entre consultas.");

  let scope = parentScope;
  if (isRecord(body.withClause)) {
    const { ctes, recursive } = body.withClause as { ctes?: Json[]; recursive?: boolean };
    if (recursive) reject("No se permite WITH RECURSIVE.");
    for (const entry of ctes ?? []) {
      const cte = entry.CommonTableExpr as Json | undefined;
      if (!cte || typeof cte.ctename !== "string") reject("No se permite esta construcción de WITH.");
      const definition = cte as Json;
      if (definition.search_clause !== undefined || definition.cycle_clause !== undefined) {
        reject("No se permiten SEARCH ni CYCLE en WITH.");
      }
      walkValue(definition.ctequery, scope);
      scope = new Set([...scope, definition.ctename as string]);
    }
  }

  for (const [key, value] of Object.entries(body)) {
    if (key === "withClause") continue;
    // Both sides of UNION/INTERSECT/EXCEPT are plain SELECT bodies.
    if ((key === "larg" || key === "rarg") && isRecord(value)) {
      walkSelect(value, scope);
      continue;
    }
    walkValue(value, scope);
  }
}

function checkRelation(body: Json, scope: Scope): void {
  const name = String(body.relname);
  if (body.catalogname !== undefined) reject("No se permite indicar la base de datos en el nombre de la vista.");

  if (body.schemaname !== undefined) {
    if (body.schemaname !== ANALYST_SCHEMA) {
      reject(`Solo se pueden consultar las vistas de ${ANALYST_SCHEMA}. Vistas disponibles: ${AVAILABLE_VIEWS}.`);
    }
    if (!VIEW_NAMES.has(name)) {
      reject(`La vista ${ANALYST_SCHEMA}.${name} no existe. Vistas disponibles: ${AVAILABLE_VIEWS}.`);
    }
    return;
  }

  if (!scope.has(name) && !VIEW_NAMES.has(name)) {
    reject(`La relación ${name} no está disponible. Vistas disponibles: ${AVAILABLE_VIEWS}.`);
  }
}

function checkFunction(body: Json): void {
  const names = stringList(body.funcname);
  const name = names.length === 2 && names[0] === "pg_catalog" ? names[1] : names.length === 1 ? names[0] : null;
  if (name === null || !ALLOWED_FUNCTIONS.has(name)) {
    reject(`La función ${names.join(".")} no está permitida. Usá solo agregados, redondeo, fechas, texto y ventanas.`);
  }
}

function checkExpression(body: Json): void {
  if (!ALLOWED_EXPRESSION_KINDS.has(String(body.kind))) reject("No se permite esta expresión.");
  checkOperators(body.name);
}

function checkOperators(value: unknown): void {
  const names = stringList(value);
  if (names.length !== 1 || !ALLOWED_OPERATORS.has(names[0])) {
    reject(`El operador ${names.join(".")} no está permitido.`);
  }
}

function checkType(body: Json): void {
  const names = stringList(body.names);
  const name = names.length === 2 && names[0] === "pg_catalog" ? names[1] : names.length === 1 ? names[0] : null;
  if (name === null || !ALLOWED_TYPES.has(name)) {
    reject(`El tipo ${names.join(".")} no está permitido en conversiones.`);
  }
  if (body.setof || (Array.isArray(body.arrayBounds) && body.arrayBounds.length > 0)) {
    reject("No se permiten arreglos en conversiones.");
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const text = isRecord(item) && isRecord(item.String) ? item.String.sval : undefined;
    return typeof text === "string" ? [text] : [];
  });
}
