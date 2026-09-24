import { NextResponse } from "next/server";
import { getRun, listRuns } from "@/lib/engine/store";
import { compareRuns, explainChange } from "@anesis/engine";
export const dynamic = "force-dynamic";
export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const run = id === "latest" ? listRuns().at(-1) : getRun(id);
    if (!run) return NextResponse.json({ error: "no such run" }, { status: 404 });
    const against = new URL(req.url).searchParams.get("compare");
    const other = against ? getRun(against) : undefined;
    return NextResponse.json({ ...run, diff: other ? compareRuns(other.result, run.result) : undefined, explanation: other ? explainChange(other.result, run.result) : undefined });
  });
}
