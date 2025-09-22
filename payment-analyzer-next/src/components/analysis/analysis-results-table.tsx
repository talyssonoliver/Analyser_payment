'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

// Assuming a structure for a single analysis entry
export interface AnalysisEntry {
  id: string;
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  sourceFile: string;
}

interface AnalysisResultsTableProps {
  entries: AnalysisEntry[];
}

export function AnalysisResultsTable({ entries }: AnalysisResultsTableProps) {
  if (entries.length === 0) {
    return null; // Don't render anything if there are no entries
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-6"
    >
      <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead>Source File</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {entries.map((entry) => (
                <motion.tr
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="hover:bg-slate-50"
                >
                  <TableCell className="font-medium">{formatDate(new Date(entry.date))}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {entry.debit ? formatCurrency(entry.debit) : ''}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {entry.credit ? formatCurrency(entry.credit) : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{entry.sourceFile}</Badge>
                  </TableCell>
                </motion.tr>
              ))}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
