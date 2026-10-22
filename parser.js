/**
 * Expression Parser & Syntax Validator
 * Supports Operands A-Z and Operators +, -, *, /, (, )
 */

const Parser = {
  /**
   * Validate and tokenize an arithmetic expression string.
   * @param {string} rawInput 
   * @returns {{ isValid: boolean, error?: string, tokens?: string[] }}
   */
  parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') {
      return { isValid: false, error: 'Please enter an arithmetic expression.' };
    }

    const cleaned = rawInput.trim().toUpperCase();
    if (cleaned.length === 0) {
      return { isValid: false, error: 'Expression cannot be empty.' };
    }

    // 1. Check for invalid characters
    const invalidCharMatch = cleaned.match(/[^A-Z0-9\+\-\*\/\(\)\s]/);
    if (invalidCharMatch) {
      return { 
        isValid: false, 
        error: `Invalid character '${invalidCharMatch[0]}' found. Only operands (A-Z) and operators (+, -, *, /, (, )) are supported.` 
      };
    }

    // 2. Tokenize expression
    const tokens = [];
    let i = 0;
    while (i < cleaned.length) {
      const char = cleaned[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/[A-Z0-9]/.test(char)) {
        // Read full operand identifier (supports single char like A-Z or A1 if needed)
        let operand = '';
        while (i < cleaned.length && /[A-Z0-9]/.test(cleaned[i])) {
          operand += cleaned[i];
          i++;
        }
        tokens.push(operand);
        continue;
      }

      if (['+', '-', '*', '/', '(', ')'].includes(char)) {
        tokens.push(char);
        i++;
        continue;
      }

      return { isValid: false, error: `Unexpected character '${char}' at index ${i}.` };
    }

    if (tokens.length === 0) {
      return { isValid: false, error: 'No valid tokens found in expression.' };
    }

    // 3. Structural Validation Checks
    let parenDepth = 0;
    const isOp = (t) => ['+', '-', '*', '/'].includes(t);
    const isOperand = (t) => /^[A-Z0-9]+$/.test(t);

    for (let k = 0; k < tokens.length; k++) {
      const curr = tokens[k];
      const prev = k > 0 ? tokens[k - 1] : null;
      const next = k < tokens.length - 1 ? tokens[k + 1] : null;

      // Parentheses balance
      if (curr === '(') {
        parenDepth++;
        if (next === ')') {
          return { isValid: false, error: 'Empty parentheses "()" are not allowed.' };
        }
        if (next && isOp(next)) {
          return { isValid: false, error: `Operator '${next}' cannot directly follow opening parenthesis '('` };
        }
        if (prev && (isOperand(prev) || prev === ')')) {
          return { isValid: false, error: `Missing operator before '(' after '${prev}'` };
        }
      } else if (curr === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          return { isValid: false, error: 'Mismatched closing parenthesis ")"' };
        }
        if (prev && isOp(prev)) {
          return { isValid: false, error: `Operator '${prev}' cannot directly precede closing parenthesis ')'` };
        }
        if (next && (isOperand(next) || next === '(')) {
          return { isValid: false, error: `Missing operator after ')' before '${next}'` };
        }
      }

      // Binary operator checks
      if (isOp(curr)) {
        if (k === 0) {
          return { isValid: false, error: `Expression cannot start with operator '${curr}'` };
        }
        if (k === tokens.length - 1) {
          return { isValid: false, error: `Expression cannot end with operator '${curr}'` };
        }
        if (prev && isOp(prev)) {
          return { isValid: false, error: `Consecutive operators '${prev} ${curr}' are invalid.` };
        }
      }

      // Adjacent operands check
      if (isOperand(curr)) {
        if (prev && isOperand(prev)) {
          return { isValid: false, error: `Missing operator between operands '${prev}' and '${curr}'` };
        }
      }
    }

    if (parenDepth !== 0) {
      return { isValid: false, error: `Unbalanced parentheses: ${parenDepth} unclosed '(' remaining.` };
    }

    return { isValid: true, tokens };
  }
};
