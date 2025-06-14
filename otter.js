#!/usr/bin/env node
const readline = require('readline');

/*
 *  Welcome To OtterScript
 *  this file is the main file for the otterscript interpreter
 *  includes the main functions and the REPL
 */

function stdin(prompt) {
  /*
   * this function provides a easy way to recieve input
   */

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt || ">> ", (input) => {
      rl.close();
      resolve(input);
    });
  });
}

function tokenizer(input_string) {
  /*
   * tokenizer
   */
  const VALID_TYPES = ['int', 'str', 'bool', 'float', 'void'];
  const tokenized_result = [];

  const input_array = tokenizePreservingStrings(input_string.trim());

  for (let i = 0; i < input_array.length; i++) {
    let raw_token = input_array[i];
    let value = raw_token;
    let inferredType = null;

    if (raw_token.includes(";")) {
      const parts = raw_token.split(";");
      if (parts.length === 2 && VALID_TYPES.includes(parts[1])) {
        value = parts[0];
        inferredType = parts[1];
      }
    }

    const token_type = typer(value);
    const column = i;

    if (!inferredType) {
      switch (token_type) {
        case "STRING_LITERAL":
          inferredType = 'str';
          break;
        case "NUMBER_LITERAL":
          inferredType = 'int';
          break;
        case "FLOAT_LITERAL":
          inferredType = 'float';
          break;
        case "BOOLEAN_LITERAL":
          inferredType = 'bool';
          break;
        case "BOOLEAN_TRUE":
          inferredType = 'bool';
          break;
        case "BOOLEAN_FALSE":
          inferredType = 'bool';
          break;
      }
    }

    const token_info = {
      type: token_type,
      value: value,
      column: column,
      inferredType: inferredType || 'void',

    };



    tokenized_result.push(token_info);
  }

  console.log(tokenized_result);
  return tokenized_result;
}

function tokenizePreservingStrings(input) {
  const tokens = [];
  let current = '';
  let inString = false;
  let quoteChar = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inString) {
      current += char;
      if (char === quoteChar) {
        tokens.push(current);
        current = '';
        inString = false;
        quoteChar = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      if (current.trim()) tokens.push(current.trim());
      current = char;
      inString = true;
      quoteChar = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) tokens.push(current.trim());

  return tokens;
}

function typer(token) {
  const TOKEN_TYPES = {
    KEYWORDS: {
      let: "KEYWORD_LET",
      const: "KEYWORD_CONST",
      if: "KEYWORD_IF",
      else: "KEYWORD_ELSE",
      while: "KEYWORD_WHILE",
      return: "KEYWORD_RETURN",
      function: "KEYWORD_FUNCTION",
      true: "BOOLEAN_TRUE",
      false: "BOOLEAN_FALSE",
    },

    OPERATORS: {
      "+": "PLUS",
      "-": "MINUS",
      "*": "MULTIPLY",
      "/": "DIVIDE",
      "%": "MODULO",
      "=": "ASSIGN",
      "==": "EQUALS",
      "===": "STRICT_EQUALS",
      "!=": "NOT_EQUALS",
      "!==": "STRICT_NOT_EQUALS",
      "<": "LESS_THAN",
      "<=": "LESS_THAN_EQUAL",
      ">": "GREATER_THAN",
      ">=": "GREATER_THAN_EQUAL",
      "&&": "LOGICAL_AND",
      "||": "LOGICAL_OR",
      "!": "LOGICAL_NOT",
    },

    SYMBOLS: {
      "(": "PAREN_LEFT",
      ")": "PAREN_RIGHT",
      "{": "BRACE_LEFT",
      "}": "BRACE_RIGHT",
      "[": "BRACKET_LEFT",
      "]": "BRACKET_RIGHT",
      ";": "SEMICOLON",
      ",": "COMMA",
      ":": "COLON",
      ".": "DOT",
    },

    LITERALS: {
      STRING: "STRING_LITERAL",
      NUMBER: "NUMBER_LITERAL",
      FLOAT: "FLOAT_LITERAL",
      BOOLEAN: "BOOLEAN_LITERAL",
      IDENTIFIER: "IDENTIFIER",
    },

    COMMENT: "COMMENT",
    EOF: "EOF"
  };

  /* 
   * this is a sort of staircase design that checks the type of a token
    * this does not work the best but does the job well
    */
  if (TOKEN_TYPES.KEYWORDS.hasOwnProperty(token)) {
    return TOKEN_TYPES.KEYWORDS[token];
  }
  if (TOKEN_TYPES.OPERATORS.hasOwnProperty(token)) {
    return TOKEN_TYPES.OPERATORS[token];
  }
  if (TOKEN_TYPES.SYMBOLS.hasOwnProperty(token)) {
    return TOKEN_TYPES.SYMBOLS[token];
  }
  if (!isNaN(token)) {
    return TOKEN_TYPES.LITERALS.NUMBER;
  }
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    return TOKEN_TYPES.LITERALS.STRING;
  }
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) {
    return TOKEN_TYPES.LITERALS.IDENTIFIER;
  }
  if (!isNaN(token)) {
    if (token.includes('.')) {
      return TOKEN_TYPES.LITERALS.FLOAT;
    } else {
      return TOKEN_TYPES.LITERALS.NUMBER;
    }
  }
  if (token === 'true' || token === 'false') {
    return TOKEN_TYPES.LITERALS.BOOLEAN;
  }
  return "UNKNOWN_TOKEN";
}

function start() {
  // get arguements in place
  // args 1 - node enviornment location
  // args 2 - otter enviornemnt location
  // args 3 - flag; if the arguement is not a flag that can be used it will overflow to a filename
  const node_env_path = process.argv[0];
  const otter_env_path = process.argv[1];
  const otter_args = process.argv.splice(2,);

  (async () => {
    const input = await stdin(">> ");
    tokenizer((input))
  })();
}

start()
