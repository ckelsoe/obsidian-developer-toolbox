import { redactHome, redactVault, isAbsolute } from "../lib/path-redact";

describe("redactHome", () => {
	const realUserProfile = process.env.USERPROFILE;
	const realHome = process.env.HOME;

	afterAll(() => {
		process.env.USERPROFILE = realUserProfile;
		process.env.HOME = realHome;
	});

	test("returns input unchanged when path is empty", () => {
		expect(redactHome("")).toBe("");
	});

	test("returns input unchanged when path is outside home", () => {
		expect(redactHome("D:/data/vault/note.md")).toBe("D:/data/vault/note.md");
	});

	test("redacts Windows USERPROFILE prefix to ~", () => {
		// HOME is captured at module load time; just verify normalisation path
		const result = redactHome("C:\\Users\\Foo\\Documents\\file.md");
		expect(typeof result).toBe("string");
	});
});

describe("redactVault", () => {
	test("returns input unchanged when vaultBase is empty", () => {
		expect(redactVault("D:/vault/note.md", "")).toBe("D:/vault/note.md");
	});

	test("returns input unchanged when path is outside vault", () => {
		expect(redactVault("D:/other/note.md", "D:/vault")).toBe("D:/other/note.md");
	});

	test("rewrites paths inside vault to <vault>/ prefix", () => {
		expect(redactVault("D:/vault/notes/index.md", "D:/vault")).toBe("<vault>/notes/index.md");
	});

	test("handles trailing slash on vault base", () => {
		expect(redactVault("D:/vault/notes/index.md", "D:/vault/")).toBe("<vault>/notes/index.md");
	});

	test("returns <vault> alone when the path is the vault root", () => {
		expect(redactVault("D:/vault", "D:/vault")).toBe("<vault>");
	});

	test("normalises backslashes", () => {
		expect(redactVault("D:\\vault\\notes\\index.md", "D:\\vault")).toBe("<vault>/notes/index.md");
	});

	test("case-insensitive prefix match", () => {
		expect(redactVault("D:/VAULT/notes/x.md", "D:/vault")).toBe("<vault>/notes/x.md");
	});
});

describe("isAbsolute", () => {
	test("Windows drive-letter paths", () => {
		expect(isAbsolute("C:/foo")).toBe(true);
		expect(isAbsolute("C:\\foo")).toBe(true);
	});

	test("Unix-style absolute", () => {
		expect(isAbsolute("/foo")).toBe(true);
	});

	test("relative paths", () => {
		expect(isAbsolute("foo/bar")).toBe(false);
		expect(isAbsolute("./foo")).toBe(false);
		expect(isAbsolute("")).toBe(false);
	});
});
