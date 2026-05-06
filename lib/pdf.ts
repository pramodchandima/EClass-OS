import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * SHARED PDF WATERMARKING UTILITY
 * Inscribes student-specific identifiers onto every page of a PDF document 
 * to discourage unauthorized distribution and ensure academic integrity.
 * 
 * @param pdfBuffer - The raw binary buffer of the original PDF document.
 * @param studentName - The full name of the student to be watermarked.
 * @param phoneNumber - The student's registered phone number for identification.
 * @returns A new Buffer containing the watermarked PDF.
 */
export async function watermarkPdf(
    pdfBuffer: Buffer,
    studentName: string,
    phoneNumber: string
): Promise<Buffer> {
    // 1. Load the existing PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();

    // 2. Embed the standard Helvetica-Bold font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 3. Construct the watermark string
    const watermarkText = `STUDENT: ${studentName.toUpperCase()} | ${phoneNumber}`;
    const fontSize = 10;

    // 4. Iterate through all pages to apply the watermark
    for (const page of pages) {
        const { width } = page.getSize();
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

        /**
         * POSITION: Bottom Center
         * x: Centered horizontally based on the text width
         * y: 35 points from the bottom edge
         */
        page.drawText(watermarkText, {
            x: (width / 2) - (textWidth / 2),
            y: 35,
            size: fontSize,
            font: font,
            color: rgb(0.5, 0.5, 0.5), // Professional Mid Gray
            opacity: 0.6,
        });
    }

    // 5. Save and return the modified buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
