import { defineNitroConfig } from "nitropack/config";

// https://nitro.build/config
export default defineNitroConfig({
	compatibilityDate: "2024-09-19",
	srcDir: "server",
	imports: false,
	preset: "cloudflare_module",
	cloudflare: {
		deployConfig: true,
		nodeCompat: true,
		wrangler: {
			durable_objects: {
				bindings: [{ name: "STATE_STORAGE", class_name: "StateStorage" }],
			},
			migrations: [
				{
					tag: "v1",
					new_classes: ["StateStorage"],
				},
			],
			observability: {
				logs: {
					enabled: true,
					head_sampling_rate: 1,
					invocation_logs: true,
				},
			},
		},
	},
});
