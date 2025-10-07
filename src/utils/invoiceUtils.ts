/**
 * Utility functions for invoice generation and formatting
 */

/**
 * Generates a consistent invoice number based on order ID and issue date
 * Format: YYYY-MM-XXXX (Year-Month-Sequence)
 * Example: 2025-09-1234
 */
export const generateInvoiceNumber = (
  orderId: string,
  issueDate: string
): string => {
  // Parse the date
  const date = new Date(issueDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  // Take first 8 characters of UUID and remove hyphens
  const orderIdClean = orderId.replace(/-/g, "").substring(0, 8).toUpperCase();

  // Create a hash-like number from the order ID for consistency
  let hash = 0;
  for (let i = 0; i < orderIdClean.length; i++) {
    const char = orderIdClean.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Get absolute value and ensure it's 4 digits
  const sequenceNumber = Math.abs(hash % 9999)
    .toString()
    .padStart(4, "0");

  // Format: YYYY-MM-XXXX (Year-Month-Sequence)
  return `${year}-${month}-${sequenceNumber}`;
};

/**
 * Generates an invoice number with a custom prefix
 * Format: PREFIX-YYYY-MM-XXXX
 * Example: INV-2025-09-1234
 */
export const generateInvoiceNumberWithPrefix = (
  orderId: string,
  issueDate: string,
  prefix: string = "INV"
): string => {
  const baseNumber = generateInvoiceNumber(orderId, issueDate);
  return `${prefix}-${baseNumber}`;
};

/**
 * Formats a date string for Japanese invoice format
 * Format: YYYY.MM.DD
 * Example: 2025.09.22
 */
export const formatInvoiceDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

/**
 * Formats amount with currency symbol for Japanese invoices
 */
export const formatInvoiceAmount = (
  amount: number,
  currency: string
): string => {
  if (currency === "JPY") {
    return `¥${amount.toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
};
