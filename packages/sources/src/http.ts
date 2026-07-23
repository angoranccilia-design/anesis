/** Client HTTP injectable — permet de tester chaque source sans réseau. */
export interface HttpResponse {
  readonly status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export interface HttpClient {
  get(url: string, init?: { headers?: Record<string, string> }): Promise<HttpResponse>;
  postJson(url: string, body: unknown, init?: { headers?: Record<string, string> }): Promise<HttpResponse>;
}

/** Implémentation par défaut sur le `fetch` global (Node 18+). */
export const fetchHttpClient: HttpClient = {
  async get(url, init) {
    const res = await fetch(url, { headers: init?.headers });
    return { status: res.status, text: () => res.text(), json: () => res.json() as Promise<unknown> };
  },
  async postJson(url, body, init) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
    return { status: res.status, text: () => res.text(), json: () => res.json() as Promise<unknown> };
  },
};
