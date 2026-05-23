import { parse } from "marked";

self.onmessage = async (e: MessageEvent) => {
    const { id, text } = e.data;
    try {
        const html = await parse(text);
        self.postMessage({ id, html });
    } catch (err: any) {
        self.postMessage({ id, error: err.message });
    }
};
