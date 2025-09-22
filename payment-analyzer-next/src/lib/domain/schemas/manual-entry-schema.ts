import { z } from 'zod';

export const createManualEntrySchema = (existingDates: Date[]) => {
  const existingDateStrings = existingDates.map(d => d.toDateString());

  return z.object({
    date: z.string()
      .refine((date) => !isNaN(Date.parse(date)), {
        message: 'Invalid date format.',
      })
      .refine((date) => !existingDateStrings.includes(new Date(date).toDateString()), {
        message: 'This date has already been entered.',
      }),
    consignments: z.coerce
          .number()
      .int({ message: 'Must be a whole number.' })
      .min(0, { message: 'Cannot be negative.' }),
    paidAmount: z.coerce
          .number()
      .min(0, { message: 'Cannot be negative.' }),
  });
};

export type ManualEntryFormValues = {
  date: string;
  consignments: number;
  paidAmount: number;
};