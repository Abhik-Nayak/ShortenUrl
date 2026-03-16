import { Icon } from "@iconify/react";
import { useUrls } from "../context/UrlContext";

const UrlCard = ({ item }) => {
  const { deleteUrl } = useUrls();

  const onCopy = async () => {
    await navigator.clipboard.writeText(item.shortUrl);
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <a href={item.shortUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
        {item.shortUrl}
      </a>
      <p className="mt-1 line-clamp-1 text-sm text-slate-600">{item.originalUrl}</p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <p>Clicks: {item.clickCount}</p>
        <p>Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleString() : "Never"}</p>
      </div>

      {item.qrCode ? <img src={item.qrCode} alt="QR" className="mt-3 h-24 w-24 rounded-md border border-slate-200 p-1" /> : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Icon icon="mdi:content-copy" />
          Copy
        </button>
        <button
          type="button"
          onClick={() => deleteUrl(item._id)}
          className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          <Icon icon="mdi:delete-outline" />
          Delete
        </button>
      </div>
    </article>
  );
};

export default UrlCard;
