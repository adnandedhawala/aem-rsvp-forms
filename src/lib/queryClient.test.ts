import { expect, it } from "vitest";
import { makeQueryClient } from "./queryClient";

it("keeps nothing", () => {
	const q = makeQueryClient().getDefaultOptions().queries;
	expect(q).toMatchObject({ staleTime: 0, gcTime: 0, retry: false });
});
