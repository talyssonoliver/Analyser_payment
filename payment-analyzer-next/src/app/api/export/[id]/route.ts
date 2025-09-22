
import { NextRequest, NextResponse } from 'next/server';
import { analysisService } from '@/lib/services/analysis-service';
import { DailyEntry } from '@/lib/domain/entities/daily-entry';

// Function to convert DailyEntry domain objects to CSV
function convertDailyEntriesToCSV(entries: readonly DailyEntry[]): string {
    if (!entries || entries.length === 0) {
        return '';
    }

    // Define CSV headers for DailyEntry data
    const headers = [
        'Date',
        'Day',
        'Consignments',
        'Rate (£)',
        'Base Payment (£)',
        'Pickups',
        'Pickup Total (£)',
        'Unloading Bonus (£)',
        'Attendance Bonus (£)',
        'Early Bonus (£)',
        'Total Bonus (£)',
        'Expected Total (£)',
        'Paid Amount (£)',
        'Difference (£)',
        'Status'
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    // Convert each DailyEntry to CSV row
    for (const entry of entries) {
        const values = [
            entry.dateFormatted,
            entry.dayName,
            entry.consignments.count.toString(),
            entry.rate.amount.toFixed(2),
            entry.basePayment.amount.toFixed(2),
            entry.pickups.count.toString(),
            entry.pickupTotal.amount.toFixed(2),
            entry.unloadingBonus.amount.toFixed(2),
            entry.attendanceBonus.amount.toFixed(2),
            entry.earlyBonus.amount.toFixed(2),
            entry.totalBonus.amount.toFixed(2),
            entry.expectedTotal.amount.toFixed(2),
            entry.paidAmount.amount.toFixed(2),
            entry.difference.amount.toFixed(2),
            entry.status
        ].map(value => {
            // Escape quotes and wrap in quotes for CSV safety
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        });

        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const analysisId = params.id;

        if (!analysisId) {
            return new NextResponse('Analysis ID is required', { status: 400 });
        }

        // Get format from query params (default to CSV)
        const { searchParams } = new URL(req.url);
        const format = searchParams.get('format') || 'csv';

        // Fetch analysis data using the service
        const { analysis: analysisData, error } = await analysisService.getAnalysisById(analysisId);

        if (error) {
            throw new Error(error);
        }

        if (!analysisData) {
            return new NextResponse('Analysis not found', { status: 404 });
        }

        // Export daily entries with proper domain object handling
        const entriesToExport = analysisData.dailyEntries || [];

        let exportData: string;
        let contentType: string;
        let filename: string;

        if (format === 'json') {
            // Export as JSON for API consumers
            const jsonData = {
                id: analysisData.id,
                title: `Analysis ${analysisData.period.start.toISOString().split('T')[0]} to ${analysisData.period.end.toISOString().split('T')[0]}`,
                status: analysisData.status,
                source: analysisData.source,
                period: {
                    start: analysisData.period.start,
                    end: analysisData.period.end
                },
                rulesVersion: analysisData.rulesVersion,
                createdAt: analysisData.createdAt,
                updatedAt: analysisData.updatedAt,
                metadata: analysisData.metadata,
                dailyEntries: entriesToExport.map(entry => ({
                    id: entry.id,
                    date: entry.dateFormatted,
                    dayName: entry.dayName,
                    consignments: entry.consignments.count,
                    rate: entry.rate.amount,
                    basePayment: entry.basePayment.amount,
                    pickups: entry.pickups.count,
                    pickupTotal: entry.pickupTotal.amount,
                    bonuses: {
                        unloading: entry.unloadingBonus.amount,
                        attendance: entry.attendanceBonus.amount,
                        early: entry.earlyBonus.amount,
                        total: entry.totalBonus.amount
                    },
                    expectedTotal: entry.expectedTotal.amount,
                    paidAmount: entry.paidAmount.amount,
                    difference: entry.difference.amount,
                    status: entry.status
                }))
            };
            exportData = JSON.stringify(jsonData, null, 2);
            contentType = 'application/json';
            filename = `analysis-${analysisId}.json`;
        } else {
            // Default to CSV export
            exportData = convertDailyEntriesToCSV(entriesToExport);
            contentType = 'text/csv';
            filename = `analysis-${analysisId}.csv`;
        }

        const headers = new Headers();
        headers.set('Content-Type', contentType);
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        return new NextResponse(exportData, { status: 200, headers });

    } catch (error) {
        console.error('[EXPORT_API_ERROR]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
