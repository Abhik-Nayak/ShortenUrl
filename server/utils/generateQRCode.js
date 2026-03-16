import QRCode from "qrcode";

const generateQRCode = async (value) => {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
};

export default generateQRCode;
