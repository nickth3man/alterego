/**
 * Condition Evaluator — Alter Ego Game Engine
 *
 * Evaluates JSON Logic rules and safe expressions against game state.
 * Uses NO runtime functions (eval, Function) — all parsing is static.
 */

import type { GameState } from './types.js';

export function buildEvaluationContext(gameState: GameState): Record<string, unknown> {
  const { player } = gameState;

  return {
    'player.name': player.name,
    'player.gender': player.gender,

    'stats.physical': player.stats.physical,
    'stats.confidence': player.stats.confidence,
    'stats.intellectual': player.stats.intellectual,
    'stats.creativity': player.stats.creativity,
    'stats.empathy': player.stats.empathy,
    'stats.resilience': player.stats.resilience,
    'stats.charm': player.stats.charm,
    'stats.discipline': player.stats.discipline,
    'stats.happiness': player.stats.happiness,
    'stats.morality': player.stats.morality,
    'stats.riskTolerance': player.stats.riskTolerance,
    'stats.independence': player.stats.independence,
    'stats.education': player.stats.education,
    'stats.career': player.stats.career,
    'stats.careerLevel': player.stats.careerLevel,
    'stats.wealth': player.stats.wealth,
    'stats.isMarried': player.stats.isMarried,
    'stats.hasChildren': player.stats.hasChildren,
    'stats.age': player.stats.age,
    'stats.currentStage': player.stats.currentStage,
    'stats.experiencesCompleted': player.stats.experiencesCompleted,
    'stats.narrativeTags': player.stats.narrativeTags,

    age: player.stats.age,
    wealth: player.stats.wealth,
    isMarried: player.stats.isMarried,
    hasChildren: player.stats.hasChildren,
    currentStage: player.stats.currentStage,
    education: player.stats.education,
    career: player.stats.career,
    careerLevel: player.stats.careerLevel,
    narrativeTags: player.stats.narrativeTags,
    experiencesCompleted: player.stats.experiencesCompleted,

    ...buildRelationshipsContext(player.stats.relationships),

    personalityProfile: player.personalityProfile,

    gamePhase: gameState.gamePhase,
    stageProgress: gameState.stageProgress,
    selectedMood: gameState.selectedMood,
    deathProbability: gameState.deathProbability,
  };
}

function buildRelationshipsContext(
  relationships: Record<string, { trust: number; affection: number; status: string }>
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};

  for (const [npcId, rel] of Object.entries(relationships)) {
    ctx[`relationships.${npcId}.trust`] = rel.trust;
    ctx[`relationships.${npcId}.affection`] = rel.affection;
    ctx[`relationships.${npcId}.status`] = rel.status;
  }

  return ctx;
}

export function resolveVar(path: string, context: Record<string, unknown>): unknown {
  if (Object.prototype.hasOwnProperty.call(context, path)) {
    return context[path];
  }

  const parts = path.split('.');
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function evaluateCondition(condition: { type: string; [key: string]: unknown }, context: Record<string, unknown>): boolean {
  if (condition.type === 'jsonLogic') {
    return toBoolean(evaluateJsonLogic(condition.rule as Record<string, unknown>, context));
  }
  if (condition.type === 'expression') {
    return evaluateSafeExpression(condition.expression as string, context);
  }
  throw new Error(`Unknown condition type: ${condition.type}`);
}

export function evaluateJsonLogic(rule: Record<string, unknown>, context: Record<string, unknown>): unknown {
  if (rule === null || rule === undefined) {
    return false;
  }

  const keys = Object.keys(rule);
  if (keys.length === 0) {
    return false;
  }

  const op = keys[0];
  const value = rule[op];

  if (!isLogicOperator(op)) {
    return value;
  }

  switch (op) {
    case 'var':
      return evaluateVar(value, context);
    case '==':
      return evaluateBinary(value, context, (a, b) => a === b);
    case '!=':
      return evaluateBinary(value, context, (a, b) => a !== b);
    case '>':
      return evaluateBinary(value, context, (a, b) => (a as number) > (b as number));
    case '<':
      return evaluateBinary(value, context, (a, b) => (a as number) < (b as number));
    case '>=':
      return evaluateBinary(value, context, (a, b) => (a as number) >= (b as number));
    case '<=':
      return evaluateBinary(value, context, (a, b) => (a as number) <= (b as number));
    case '!':
      return evaluateNot(value, context);
    case 'and':
      return evaluateAnd(value, context);
    case 'or':
      return evaluateOr(value, context);
    case 'in':
      return evaluateIn(value, context);
    case '+':
      return evaluateNumeric('+', value, context);
    case '-':
      return evaluateNumeric('-', value, context);
    case '*':
      return evaluateNumeric('*', value, context);
    case '/':
      return evaluateNumeric('/', value, context);
    default:
      throw new Error(`Unsupported JSON Logic operator: ${op}`);
  }
}

function isLogicOperator(key: string): boolean {
  return [
    'var', '==', '!=', '>', '<', '>=', '<=',
    '!', 'and', 'or', 'in',
    '+', '-', '*', '/',
  ].includes(key);
}

function evaluateVar(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    return resolveVar(value, context);
  }
  if (Array.isArray(value) && value.length >= 1) {
    return resolveVar(value[0] as string, context);
  }
  return undefined;
}

function evaluateBinary(
  value: unknown,
  context: Record<string, unknown>,
  op: (a: unknown, b: unknown) => boolean
): boolean {
  if (!Array.isArray(value) || value.length < 2) {
    return false;
  }
  const left = evaluateJsonLogic(value[0] as Record<string, unknown>, context);
  const right = evaluateJsonLogic(value[1] as Record<string, unknown>, context);
  return op(left, right);
}

function evaluateNot(value: unknown, context: Record<string, unknown>): boolean {
  const evaluated = Array.isArray(value)
    ? evaluateJsonLogic(value[0] as Record<string, unknown>, context)
    : value;
  return !toBoolean(evaluated);
}

function evaluateAnd(value: unknown, context: Record<string, unknown>): boolean {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (!toBoolean(evaluateJsonLogic(item as Record<string, unknown>, context))) {
      return false;
    }
  }
  return true;
}

function evaluateOr(value: unknown, context: Record<string, unknown>): boolean {
  if (!Array.isArray(value)) return false;
  for (const item of value) {
    if (toBoolean(evaluateJsonLogic(item as Record<string, unknown>, context))) {
      return true;
    }
  }
  return false;
}

function evaluateIn(value: unknown, context: Record<string, unknown>): boolean {
  if (!Array.isArray(value) || value.length < 2) return false;
  const needle = evaluateJsonLogic(value[0] as Record<string, unknown>, context);
  const haystackRaw = evaluateJsonLogic(value[1] as Record<string, unknown>, context);
  return inArray(needle, haystackRaw);
}

function evaluateNumeric(
  op: string,
  value: unknown,
  context: Record<string, unknown>
): number {
  if (!Array.isArray(value) || value.length < 2) return 0;
  const left = evaluateJsonLogic(value[0] as Record<string, unknown>, context);
  const right = evaluateJsonLogic(value[1] as Record<string, unknown>, context);
  const a = Number(left);
  const b = Number(right);

  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default: return 0;
  }
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  return true;
}

function inArray(needle: unknown, haystack: unknown): boolean {
  if (!Array.isArray(haystack)) return false;
  return haystack.some(item => Object.is(item, needle));
}

type TokenKind =
  | 'NUMBER' | 'STRING' | 'IDENT' | 'BOOLEAN'
  | 'AND' | 'OR' | 'NOT'
  | 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ' | 'NEQ'
  | 'LPAREN' | 'RPAREN' | 'DOT' | 'COMMA'
  | 'INCLUDES' | 'EOF';

interface Token {
  kind: TokenKind;
  value: string | number | boolean;
}

const KEYWORDS: Record<string, TokenKind> = {
  'true': 'BOOLEAN', 'false': 'BOOLEAN',
  'and': 'AND', 'or': 'OR', 'not': 'NOT',
  'includes': 'INCLUDES',
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(input[i + 1]))) {
      let num = '';
      while (i < input.length && /[\d.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ kind: 'NUMBER', value: parseFloat(num) });
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      let str = '';
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < input.length) { i++; }
        str += input[i++];
      }
      i++;
      tokens.push({ kind: 'STRING', value: str });
      continue;
    }

    const two = input.slice(i, i + 2);
    if (two === '>=') { tokens.push({ kind: 'GTE', value: two }); i += 2; continue; }
    if (two === '<=') { tokens.push({ kind: 'LTE', value: two }); i += 2; continue; }
    if (two === '==') { tokens.push({ kind: 'EQ', value: two }); i += 2; continue; }
    if (two === '!=') { tokens.push({ kind: 'NEQ', value: two }); i += 2; continue; }
    if (two === '&&') { tokens.push({ kind: 'AND', value: two }); i += 2; continue; }
    if (two === '||') { tokens.push({ kind: 'OR', value: two }); i += 2; continue; }

    switch (ch) {
      case '(': tokens.push({ kind: 'LPAREN', value: ch }); break;
      case ')': tokens.push({ kind: 'RPAREN', value: ch }); break;
      case '.': tokens.push({ kind: 'DOT', value: ch }); break;
      case ',': tokens.push({ kind: 'COMMA', value: ch }); break;
      case '>': tokens.push({ kind: 'GT', value: ch }); break;
      case '<': tokens.push({ kind: 'LT', value: ch }); break;
      case '!': tokens.push({ kind: 'NOT', value: ch }); break;
      default:
        if (/[a-zA-Z_$]/.test(ch)) {
          let ident = '';
          while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
            ident += input[i++];
          }
          const kind = KEYWORDS[ident.toLowerCase()] ?? 'IDENT';
          if (kind === 'BOOLEAN') {
            tokens.push({ kind, value: ident.toLowerCase() === 'true' });
          } else {
            tokens.push({ kind, value: ident });
          }
        }
    }
    i++;
  }

  tokens.push({ kind: 'EOF', value: '' });
  return tokens;
}

type AstNode =
  | { type: 'literal'; value: unknown }
  | { type: 'var'; path: string }
  | { type: 'member'; object: AstNode; property: string }
  | { type: 'call'; object: AstNode; method: string; args: AstNode[] }
  | { type: 'not'; operand: AstNode }
  | { type: 'and' | 'or'; left: AstNode; right: AstNode }
  | { type: 'compare'; op: TokenKind; left: AstNode; right: AstNode };

class SafeExpressionParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { kind: 'EOF', value: '' };
  }

  private advance(): Token {
    const tok = this.peek();
    this.pos++;
    return tok;
  }

  private expect(kind: TokenKind): Token {
    const tok = this.advance();
    if (tok.kind !== kind) {
      throw new Error(`Expected ${kind} but got ${tok.kind} (${tok.value})`);
    }
    return tok;
  }

  parse(): (ctx: Record<string, unknown>) => boolean {
    const ast = this.parseExpr();
    this.expect('EOF');
    return (ctx: Record<string, unknown>) => this.evaluate(ast, ctx);
  }

  private parseExpr(): AstNode {
    return this.parseLogical();
  }

  private parseLogical(): AstNode {
    let left = this.parseComparison();

    while (this.peek().kind === 'AND' || this.peek().kind === 'OR') {
      const op = this.advance();
      const right = this.parseComparison();
      left = { type: op.kind === 'AND' ? 'and' : 'or', left, right };
    }

    return left;
  }

  private parseComparison(): AstNode {
    let left = this.parsePrimary();

    while (true) {
      const tok = this.peek();
      if (tok.kind === 'GTE' || tok.kind === 'LTE' || tok.kind === 'GT' ||
          tok.kind === 'LT' || tok.kind === 'EQ' || tok.kind === 'NEQ') {
        this.advance();
        const right = this.parsePrimary();
        left = { type: 'compare', op: tok.kind, left, right };
      } else {
        break;
      }
    }

    return left;
  }

  private parsePrimary(): AstNode {
    const tok = this.peek();

    if (tok.kind === 'NOT') {
      this.advance();
      const operand = this.parsePrimary();
      return { type: 'not', operand };
    }

    if (tok.kind === 'LPAREN') {
      this.advance();
      const expr = this.parseExpr();
      this.expect('RPAREN');
      return expr;
    }

    if (tok.kind === 'IDENT') {
      return this.parseVariableOrCall();
    }

    if (tok.kind === 'NUMBER' || tok.kind === 'STRING' || tok.kind === 'BOOLEAN') {
      this.advance();
      return { type: 'literal', value: tok.value };
    }

    throw new Error(`Unexpected token: ${tok.kind} (${tok.value})`);
  }

  private parseVariableOrCall(): AstNode {
    const nameTok = this.expect('IDENT');
    let node: AstNode = { type: 'var', path: String(nameTok.value) };

    while (this.peek().kind === 'DOT') {
      this.advance();
      const propTok = this.expect('IDENT');
      node = { type: 'member', object: node, property: String(propTok.value) };
    }

    if (this.peek().kind === 'DOT') {
      this.advance();
      const methodTok = this.expect('IDENT');
      if (methodTok.value !== 'includes') {
        throw new Error(`Unsupported method: ${methodTok.value}`);
      }
      this.expect('LPAREN');
      const arg = this.parseValue();
      this.expect('RPAREN');
      return { type: 'call', object: node, method: 'includes', args: [arg] };
    }

    return node;
  }

  private parseValue(): AstNode {
    const tok = this.peek();
    if (tok.kind === 'NUMBER' || tok.kind === 'STRING' || tok.kind === 'BOOLEAN') {
      this.advance();
      return { type: 'literal', value: tok.value };
    }
    return this.parseVariableOrCall();
  }

  private evaluate(node: AstNode, ctx: Record<string, unknown>): boolean {
    switch (node.type) {
      case 'literal':
        return toBoolean(node.value);

      case 'var':
        return toBoolean(resolveVar(node.path, ctx));

      case 'member': {
        const obj = this.evaluate(node.object, ctx);
        if (obj === null || obj === undefined) return false;
        if (typeof obj !== 'object') return false;
        const val = (obj as Record<string, unknown>)[node.property];
        return toBoolean(val);
      }

      case 'call': {
        const obj = this.evaluate(node.object, ctx);
        if (!Array.isArray(obj)) return false;
        const arg = this.evaluate(node.args[0], ctx);
        return obj.some(item => Object.is(item, arg));
      }

      case 'not':
        return !this.evaluate(node.operand, ctx);

      case 'and':
        return this.evaluate(node.left, ctx) && this.evaluate(node.right, ctx);

      case 'or':
        return this.evaluate(node.left, ctx) || this.evaluate(node.right, ctx);

      case 'compare': {
        const left = this.evaluate(node.left, ctx);
        const right = this.evaluate(node.right, ctx);
        switch (node.op) {
          case 'GTE': return Number(left) >= Number(right);
          case 'LTE': return Number(left) <= Number(right);
          case 'GT':  return Number(left) > Number(right);
          case 'LT':  return Number(left) < Number(right);
          case 'EQ':  return Object.is(left, right);
          case 'NEQ': return !Object.is(left, right);
          default: return false;
        }
      }

      default:
        return false;
    }
  }
}

export function evaluateSafeExpression(expression: string, context: Record<string, unknown>): boolean {
  if (typeof expression !== 'string' || expression.trim() === '') {
    return false;
  }

  const tokens = tokenize(expression);
  const parser = new SafeExpressionParser(tokens);
  const evaluator = parser.parse();
  return evaluator(context);
}

export { type TokenKind, type Token };
