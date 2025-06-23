#!/usr/bin/env node
const readline = require("readline");

const globalScope = {};

function stdin(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(prompt || ">> ", answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Minimal tokenizer, parse, evaluate
function tokenizer(input) {
  return input.trim().split(/\s+/).map((value, idx) => ({
    type: /^[0-9]+$/.test(value) ? "NUMBER_LITERAL" : "IDENTIFIER",
    value,
    column: idx
  }));
}

function parse(tokens) {
  if (tokens[0].value === "let" && tokens.length >= 3) {
    return {
      type: "Program",
      body: [{
        type: "VariableDeclaration",
        name: tokens[1].value,
        value: { type: "NumberLiteral", value: parseInt(tokens[2].value) }
      }]
    };
  }

  throw new Error("Invalid syntax");
}

function evaluate(ast) {
  for (const node of ast.body) {
    if (node.type === "VariableDeclaration") {
      globalScope[node.name] = node.value.value;
      console.log(`✅ Declared ${node.name} = ${node.value.value}`);
    }
  }
}

async function repl() {
  let input = "";

  while (input !== "stop") {
    try {
      input = await stdin(">> ");
      if (input === "stop") break;

      const tokens = tokenizer(input);
      const ast = parse(tokens);
      evaluate(ast);
    } catch (err) {
      console.error("❌ Error:", err.message);
    }
  }

  console.log("👋 OtterScript REPL ended.");
}

repl();
