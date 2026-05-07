import { z } from "zod";
import { getGraphClient } from "../../auth/index.js";
import type { ToolDef } from "../types.js";

const InputSchema = z.object({
  /** Optional list of $select fields. */
  select: z.array(z.string()).optional(),
});

export const meGetProfile: ToolDef<z.infer<typeof InputSchema>> = {
  name: "me_getProfile",
  description:
    "Get the signed-in user's profile from /me (delegated). First call may open a browser for interactive sign-in; subsequent calls use the cached refresh token. Returns id, displayName, mail, jobTitle, etc.",
  inputSchema: InputSchema,
  mode: "delegated",
  handler: async ({ select }) => {
    const client = await getGraphClient({ mode: "delegated" });
    let req = client.api("/me");
    if (select && select.length > 0) req = req.select(select.join(","));
    return await req.get();
  },
};
