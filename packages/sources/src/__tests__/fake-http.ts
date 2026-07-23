import type { HttpClient, HttpResponse } from "../http.js";

interface Canned {
  status: number;
  body: string | unknown;
}

const mk = (r: Canned): HttpResponse => ({
  status: r.status,
  text: async () => (typeof r.body === "string" ? r.body : JSON.stringify(r.body)),
  json: async () => (typeof r.body === "string" ? (JSON.parse(r.body) as unknown) : r.body),
});

export function fakeHttp(handlers: {
  get?: (url: string) => Canned;
  postJson?: (url: string, body: unknown) => Canned;
}): HttpClient {
  return {
    get: async (url) => mk(handlers.get ? handlers.get(url) : { status: 404, body: "" }),
    postJson: async (url, body) => mk(handlers.postJson ? handlers.postJson(url, body) : { status: 404, body: "" }),
  };
}
