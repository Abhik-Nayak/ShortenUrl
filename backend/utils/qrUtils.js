/**
 * QR Code Utility Functions
 * Generates and manages QR codes
 */

const QRCode = require("qrcode");

/**
 * Generate QR code as base64 string
 * @param {string} url - URL to encode in QR code
 * @returns {Promise<string>} Base64 encoded QR code
 */
const generateQRCodeBase64 = async (url) => {
  try {
    const qrCode = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrCode;
  } catch (err) {
    console.error("Error generating QR code:", err);
    throw err;
  }
};

/**
 * Generate QR code as buffer (for file storage)
 * @param {string} url - URL to encode in QR code
 * @returns {Promise<Buffer>} QR code as buffer
 */
const generateQRCodeBuffer = async (url) => {
  try {
    const qrCode = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "H",
      type: "image/png",
      quality: 0.95,
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrCode;
  } catch (err) {
    console.error("Error generating QR code:", err);
    throw err;
  }
};

module.exports = {
  generateQRCodeBase64,
  generateQRCodeBuffer,
};
