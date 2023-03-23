module.exports = {
	"env": {
		"browser": true,
		"commonjs": true,
		"es2015": true
	},
	"extends": "eslint:recommended",
	"parserOptions": {
		"ecmaVersion": "latest"
	},
	"rules": {
		"indent": [
			"error",
			"tab"
		],
		"linebreak-style": [
			"error",
			"windows"
		],
		"quotes": [
			"error",
			"double",
			{ "allowTemplateLiterals": true }
		],
		"semi": [
			"error",
			"always"
		],
		"no-var": [
			"error"
		],

	}
};
