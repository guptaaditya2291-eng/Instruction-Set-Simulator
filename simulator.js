/**
 * Instruction Set Simulator Core Logic
 * Converts arithmetic infix tokens into Postfix, 3-Address, 2-Address, 1-Address, and 0-Address instructions.
 */

const Simulator = {
  /**
   * Helper: Map operator symbols to assembly operation names
   */
  opNameMap: {
    '+': 'ADD',
    '-': 'SUB',
    '*': 'MUL',
    '/': 'DIV'
  },

  /**
   * 1. Infix to Postfix Conversion using Shunting Yard Algorithm
   * @param {string[]} tokens 
   * @returns {{ postfixTokens: string[], postfixString: string }}
   */
  toPostfix(tokens) {
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const outputQueue = [];
    const operatorStack = [];

    tokens.forEach(token => {
      if (/^[A-Z0-9]+$/.test(token)) {
        outputQueue.push(token);
      } else if (['+', '-', '*', '/'].includes(token)) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '('
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.pop(); // Remove '('
      }
    });

    while (operatorStack.length > 0) {
      outputQueue.push(operatorStack.pop());
    }

    return {
      postfixTokens: outputQueue,
      postfixString: outputQueue.join(' ')
    };
  },

  /**
   * Helper: Build Expression AST from Postfix tokens
   */
  buildAST(postfixTokens) {
    const stack = [];
    postfixTokens.forEach(token => {
      if (/^[A-Z0-9]+$/.test(token)) {
        stack.push({ type: 'operand', val: token });
      } else {
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ type: 'operator', op: token, left, right });
      }
    });
    return stack[0];
  },

  /**
   * 2. Three-Address Code Generator
   * Format: OPCODE DEST, SRC1, SRC2 (e.g. ADD T1, A, B)
   * @param {string[]} postfixTokens 
   * @returns {string[]} List of 3-address instructions
   */
  generate3Address(postfixTokens) {
    const instructions = [];
    const stack = [];
    let tempCount = 1;

    postfixTokens.forEach(token => {
      if (/^[A-Z0-9]+$/.test(token)) {
        stack.push(token);
      } else {
        const right = stack.pop();
        const left = stack.pop();
        const tempVar = `T${tempCount++}`;
        const opName = this.opNameMap[token];
        instructions.push(`${opName} ${tempVar}, ${left}, ${right}`);
        stack.push(tempVar);
      }
    });

    return instructions;
  },


  /**
   * 3. Two-Address Code Generator (Register Machine)
   * Format: MOV R1, A / ADD R1, B
   * @param {string[]} postfixTokens 
   * @returns {string[]} List of 2-address instructions
   */
  generate2Address(postfixTokens) {
    const instructions = [];
    const ast = this.buildAST(postfixTokens);
    let regCount = 1;

    // Helper function to evaluate AST into registers
    const evalNode = (node) => {
      if (!node) return null;
      if (node.type === 'operand') {
        return { isReg: false, val: node.val };
      }

      const leftRes = evalNode(node.left);
      const rightRes = evalNode(node.right);
      const opName = this.opNameMap[node.op];

      // Case 1: Both operands are simple variables
      if (!leftRes.isReg && !rightRes.isReg) {
        const reg = `R${regCount++}`;
        instructions.push(`MOV ${reg}, ${leftRes.val}`);
        instructions.push(`${opName} ${reg}, ${rightRes.val}`);
        return { isReg: true, val: reg };
      }

      // Case 2: Left is register, right is simple variable
      if (leftRes.isReg && !rightRes.isReg) {
        instructions.push(`${opName} ${leftRes.val}, ${rightRes.val}`);
        return leftRes;
      }

      // Case 3: Left is simple variable, right is register
      if (!leftRes.isReg && rightRes.isReg) {
        if (['+', '*'].includes(node.op)) {
          // Commutative
          instructions.push(`${opName} ${rightRes.val}, ${leftRes.val}`);
          return rightRes;
        } else {
          // Non-commutative (SUB, DIV)
          const newReg = `R${regCount++}`;
          instructions.push(`MOV ${newReg}, ${leftRes.val}`);
          instructions.push(`${opName} ${newReg}, ${rightRes.val}`);
          return { isReg: true, val: newReg };
        }
      }

      // Case 4: Both are registers
      instructions.push(`${opName} ${leftRes.val}, ${rightRes.val}`);
      return leftRes;
    };

    evalNode(ast);
    return instructions;
  },

  /**
   * 4. One-Address Code Generator (Accumulator Model)
   * Instructions: LOAD, STORE, ADD, SUB, MUL, DIV
   * @param {string[]} postfixTokens 
   * @returns {string[]} List of 1-address instructions
   */
  generate1Address(postfixTokens) {
    const instructions = [];
    const ast = this.buildAST(postfixTokens);
    let tempCount = 1;

    // Evaluates tree, returns whether result is an operand string or in AC
    const evalAc = (node) => {
      if (node.type === 'operand') {
        return { inAc: false, val: node.val };
      }

      const leftRes = evalAc(node.left);

      // If left is in AC and we need to evaluate right subtree, we must STORE AC to TEMP
      let leftVal = leftRes.val;
      if (leftRes.inAc) {
        leftVal = `TEMP${tempCount++}`;
        instructions.push(`STORE ${leftVal}`);
      }

      const rightRes = evalAc(node.right);
      let rightVal = rightRes.val;
      if (rightRes.inAc) {
        rightVal = `TEMP${tempCount++}`;
        instructions.push(`STORE ${rightVal}`);
      }

      const opName = this.opNameMap[node.op];

      // Now compute left OP right into AC
      if (!leftRes.inAc && !rightRes.inAc) {
        instructions.push(`LOAD ${leftVal}`);
        instructions.push(`${opName} ${rightVal}`);
      } else if (leftRes.inAc && !rightRes.inAc) {
        // Left was stored in leftVal
        instructions.push(`LOAD ${leftVal}`);
        instructions.push(`${opName} ${rightVal}`);
      } else if (!leftRes.inAc && rightRes.inAc) {
        // Right was stored in rightVal
        if (['+', '*'].includes(node.op)) {
          instructions.push(`${opName} ${leftVal}`);
        } else {
          instructions.push(`STORE ${rightVal}`);
          instructions.push(`LOAD ${leftVal}`);
          instructions.push(`${opName} ${rightVal}`);
        }
      } else {
        // Both were subexpressions, left stored in leftVal, right in rightVal
        instructions.push(`LOAD ${leftVal}`);
        instructions.push(`${opName} ${rightVal}`);
      }

      return { inAc: true, val: 'AC' };
    };

    evalAc(ast);
    return instructions;
  },

  /**
   * 5. Zero-Address Code Generator (Stack Machine Model)
   * Instructions: PUSH, ADD, SUB, MUL, DIV
   * @param {string[]} postfixTokens 
   * @returns {string[]} List of 0-address instructions
   */
  generate0Address(postfixTokens) {
    const instructions = [];

    postfixTokens.forEach(token => {
      if (/^[A-Z0-9]+$/.test(token)) {
        instructions.push(`PUSH ${token}`);
      } else if (this.opNameMap[token]) {
        instructions.push(this.opNameMap[token]);
      }
    });

    return instructions;
  }
};
