import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { CalculatorSummary } from "@/lib/types/calculator";

import {
  SUMMARY_DISCLAIMER,
  SUMMARY_TITLE,
  summaryAssumptions,
  toSummaryRows,
} from "./summary-step-values";

// The "ficha" step 8 downloads. Rendered on the server by @react-pdf/renderer
// (a PDF tree, not the DOM), with the same rows and wording as the screen.
// Built-in Helvetica only: it covers the Spanish accents and needs no font file.

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1f2a24" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20, color: "#0a5933", marginBottom: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#d9e3dd",
  },
  label: { color: "#4b5a52" },
  value: { fontFamily: "Helvetica-Bold" },
  note: { marginTop: 16, fontSize: 9, color: "#4b5a52" },
});

// A plain function, not a component: renderToBuffer takes the <Document> itself.
export function summaryPdfDocument(summary: CalculatorSummary) {
  return (
    <Document title={SUMMARY_TITLE} language="es-AR">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{SUMMARY_TITLE}</Text>
        {toSummaryRows(summary).map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value}>{row.value}</Text>
          </View>
        ))}
        <Text style={styles.note}>{summaryAssumptions(summary)}</Text>
        <Text style={styles.note}>{SUMMARY_DISCLAIMER}</Text>
      </Page>
    </Document>
  );
}
