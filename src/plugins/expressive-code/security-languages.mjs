// Small TextMate grammars for the security-note languages absent from Shiki's bundle.
// Keep the original fence names and highlight their own syntax rather than aliasing
// unrelated languages or falling back to plain text.
const quotedStrings = [
	{ name: "string.quoted.double", begin: '"', end: '"', patterns: [{ name: "constant.character.escape", match: "\\\\." }] },
	{ name: "string.quoted.single", begin: "'", end: "'", patterns: [{ name: "constant.character.escape", match: "\\\\." }] },
];
const numbers = { name: "constant.numeric", match: "\\b(?:0[xX][0-9a-fA-F]+|[0-9]+(?:\\.[0-9]+)?)\\b" };
const lineComment = (prefix) => ({ name: "comment.line", begin: prefix, end: "$" });
const keywords = (words) => ({ name: "keyword.control", match: `\\b(?:${words})\\b` });
const grammar = (name, patterns) => ({
	name,
	scopeName: `source.${name}`,
	patterns: [...patterns, ...quotedStrings, numbers],
});

export const securityLanguages = [
	grammar("redis", [
		lineComment("#"),
		{ name: "keyword.control", match: "(?i)\\b(?:GET|SET|SETNX|MGET|MSET|DEL|EXISTS|EXPIRE|TTL|KEYS|SCAN|FLUSHALL|FLUSHDB|CONFIG|AUTH|SELECT|INFO|PING|EVAL|SAVE|BGSAVE|SLAVEOF|REPLICAOF|HGET|HSET|LPUSH|RPUSH|LRANGE|SADD|SMEMBERS|ZADD|PUBLISH|SUBSCRIBE)\\b" },
	]),
	grammar("nasl", [
		lineComment("#"),
		keywords("if|else|for|foreach|while|repeat|until|function|return|include|local_var|global_var|exit|break|continue"),
		{ name: "entity.name.function", match: "\\b[A-Za-z_][A-Za-z0-9_]*(?=\\s*\\()" },
	]),
	grammar("yara", [
		lineComment("//"),
		{ name: "comment.block", begin: "/\\*", end: "\\*/" },
		keywords("rule|private|global|meta|strings|condition|and|or|not|of|them|all|any|for|in|at|filesize|entrypoint|uint8|uint16|uint32|ascii|wide|nocase|fullword|xor|base64|import|include|true|false"),
		{ name: "variable.other", match: "[$#@!][A-Za-z_][A-Za-z0-9_]*" },
	]),
	grammar("eql", [
		lineComment("//"),
		keywords("sequence|by|with|maxspan|until|join|where|and|or|not|in|like|regex|any|true|false|null"),
		{ name: "variable.other", match: "\\b(?:process|file|network|registry|event|user|host)\\.[A-Za-z0-9_.]+" },
	]),
	grammar("smali", [
		lineComment("#"),
		{ name: "keyword.control", match: "(?:^|(?<=\\s))\\.[a-z][a-z0-9-]*\\b|\\b(?:public|private|protected|static|final|abstract|native|synthetic)\\b" },
		{ name: "entity.name.function", match: "(?:^|(?<=\\s))(?:invoke|move|const|return|iget|iput|sget|sput|new|if|goto|throw|check|array|add|sub|mul|div)[a-z0-9/-]*\\b" },
		{ name: "variable.other", match: "\\b[vp][0-9]+\\b" },
		{ name: "entity.name.type", match: "L[\\w/$]+;" },
	]),
];
