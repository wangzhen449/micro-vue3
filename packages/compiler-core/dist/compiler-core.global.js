var VueCompilerCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/compiler-core/src/index.ts
  var src_exports = {};
  __export(src_exports, {
    compile: () => compile
  });

  // packages/shared/src/index.ts
  var isArray = Array.isArray;
  var isString = (val) => typeof val === "string";
  var isSymbol = (val) => typeof val === "symbol";

  // packages/compiler-core/src/runtimeHelpers.ts
  var FRAGMENT = Symbol("Fragment");
  var TO_DISPLAY_STRING = Symbol("toDisplayString");
  var CREATE_TEXT = Symbol("createTextVNode");
  var CREATE_ELEMENT_VNODE = Symbol("createElementVNode");
  var OPEN_BLOCK = Symbol("openBlock");
  var CREATE_ELEMENT_BLOCK = Symbol("createElementBlock");
  var helperNameMap = {
    [FRAGMENT]: "Fragment",
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_TEXT]: "createTextVNode",
    [CREATE_ELEMENT_VNODE]: "createElementVNode",
    [OPEN_BLOCK]: "openBlock",
    [CREATE_ELEMENT_BLOCK]: "createElementBlock"
  };

  // packages/compiler-core/src/ast.ts
  function createRoot(children, loc) {
    return {
      type: 0 /* ROOT */,
      children,
      loc
    };
  }
  function createCompoundExpression(children, loc) {
    return {
      type: 8 /* COMPOUND_EXPRESSION */,
      children,
      loc
    };
  }
  function createCallExpression(callee, args) {
    return {
      type: 14 /* JS_CALL_EXPRESSION */,
      callee,
      arguments: args
    };
  }
  function createObjectExpression(properties) {
    return {
      type: 15 /* JS_OBJECT_EXPRESSION */,
      properties
    };
  }
  function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
      type: 13 /* VNODE_CALL */,
      tag,
      props,
      children
    };
  }

  // packages/compiler-core/src/codegen.ts
  var aliasHelper = (s) => `${helperNameMap[s]} as _${helperNameMap[s]}`;
  function createCodegenContext(ast) {
    const context = {
      code: ``,
      indentLevel: 0,
      helper(key) {
        return `_${helperNameMap[key]}`;
      },
      push(code) {
        context.code += code;
      },
      indent() {
        newline(++context.indentLevel);
      },
      deindent(withoutNewLine = false) {
        if (withoutNewLine) {
          --context.indentLevel;
        } else {
          newline(--context.indentLevel);
        }
      },
      newline() {
        newline(context.indentLevel);
      }
    };
    function newline(n) {
      context.push("\n" + `  `.repeat(n));
    }
    return context;
  }
  function generate(ast) {
    const context = createCodegenContext(ast);
    const { push, indent, deindent, newline } = context;
    const hasHelpers = ast.helpers.length > 0;
    genFunctionPreamble(ast, context);
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    push(`function ${functionName}(${signature}) {`);
    indent();
    if (ast.codegenNode) {
      genNode(ast.codegenNode, context);
    }
    deindent();
    push("}");
    console.log(context.code);
  }
  function genFunctionPreamble(ast, context) {
    const { push, newline } = context;
    if (ast.helpers.length > 0) {
      push(`import { ${ast.helpers.map(aliasHelper).join(", ")} } from "vue"
`);
      newline();
      push(`export `);
    }
  }
  function genNodeListAsArray(nodes, context) {
    context.push(`[`);
    genNodeList(nodes, context);
    context.push(`]`);
  }
  function genNodeList(nodes, context) {
    const { push, newline } = context;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] === null ? "null" : nodes[i];
      if (isString(node)) {
        push(node);
      } else if (isArray(node)) {
        genNodeListAsArray(node, context);
      } else {
        genNode(node, context);
      }
      if (i < nodes.length - 1) {
        push(", ");
      }
    }
  }
  function genNode(node, context) {
    if (isString(node)) {
      context.push(node);
      return;
    }
    if (isSymbol(node)) {
      context.push(context.helper(node));
      return;
    }
    switch (node.type) {
      case 2 /* TEXT */:
        genText(node, context);
        break;
      case 12 /* TEXT_CALL */:
        genNode(node.codegenNode, context);
        break;
      case 5 /* INTERPOLATION */:
        genInterpolation(node, context);
        break;
      case 4 /* SIMPLE_EXPRESSION */:
        genExpression(node, context);
        break;
      case 8 /* COMPOUND_EXPRESSION */:
        genCompoundExpression(node, context);
        break;
      case 1 /* ELEMENT */:
        genNode(node.codegenNode, context);
        break;
      case 13 /* VNODE_CALL */:
        genVNodeCall(node, context);
        break;
      case 14 /* JS_CALL_EXPRESSION */:
        genCallExpression(node, context);
        break;
      case 15 /* JS_OBJECT_EXPRESSION */:
        genObjectExpression(node, context);
        break;
      default:
        break;
    }
  }
  function genText(node, context) {
    context.push(JSON.stringify(node.content));
  }
  function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
  }
  function genExpression(node, context) {
    context.push(node.content);
  }
  function genCompoundExpression(node, context) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (isString(child)) {
        context.push(child);
      } else {
        genNode(child, context);
      }
    }
  }
  function genVNodeCall(node, context) {
    const { push, helper } = context;
    const {
      tag,
      props,
      children,
      isBlock
    } = node;
    if (isBlock) {
      push(`(${helper(OPEN_BLOCK)}, `);
    }
    const callHelper = isBlock ? CREATE_ELEMENT_BLOCK : CREATE_ELEMENT_VNODE;
    push(helper(callHelper) + `(`);
    genNodeList([tag, props, children], context);
    push(`)`);
    if (isBlock) {
      push(`)`);
    }
  }
  function genCallExpression(node, context) {
    const { push, helper } = context;
    const callee = isString(node.callee) ? node.callee : helper(node.callee);
    push(callee + `(`);
    genNodeList(node.arguments, context);
    push(")");
  }
  function genObjectExpression(node, context) {
    const { push, indent, deindent, newline } = context;
    const { properties } = node;
    if (!properties.length) {
      push(`{}`, node);
      return;
    }
    const multilines = properties.length > 1;
    push(multilines ? `{` : `{ `);
    multilines && indent();
    for (let i = 0; i < properties.length; i++) {
      const { key, value } = properties[i];
      push(key);
      push(`: `);
      genNode(value, context);
      if (i < properties.length - 1) {
        push(`,`);
        newline();
      }
    }
    multilines && deindent();
    push(multilines ? `}` : ` }`);
  }

  // packages/compiler-core/src/utils.ts
  function advancePositionWithMutation(pos, source, numberOfCharacters) {
    let linesCount = 0;
    let lastNewLinePos = -1;
    for (let i = 0; i < numberOfCharacters; i++) {
      if (source.codePointAt(i) === 10) {
        linesCount++;
        lastNewLinePos = i;
      }
    }
    pos.offset += numberOfCharacters;
    pos.line += linesCount;
    pos.column = lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos;
  }
  function isText(node) {
    return node.type === 5 /* INTERPOLATION */ || node.type === 2 /* TEXT */;
  }
  function makeBlock(node, { helper, removeHelper }) {
    if (!node.isBlock) {
      node.isBlock = true;
      removeHelper(CREATE_ELEMENT_VNODE);
      helper(OPEN_BLOCK);
      helper(CREATE_ELEMENT_BLOCK);
    }
  }

  // packages/compiler-core/src/parse.ts
  function parse(content) {
    const context = createParserContext(content);
    const start = getCursor(context);
    return createRoot(parseChildren(context), getSelection(context, start));
  }
  function createParserContext(content) {
    return {
      column: 1,
      line: 1,
      offset: 0,
      originalSource: content,
      source: content
    };
  }
  function parseChildren(context) {
    const nodes = [];
    while (!isEnd(context)) {
      let node;
      const s = context.source;
      if (s.startsWith("{{")) {
        node = parseInterpolation(context);
      } else if (s[0] === "<") {
        node = parseElement(context);
      }
      if (!node) {
        node = parseText(context);
      }
      nodes.push(node);
    }
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === 2 /* TEXT */) {
        if (!/[^\t\r\n\f ]/.test(node.content)) {
          nodes[i] = null;
        }
      }
    }
    return nodes.filter(Boolean);
  }
  function parseInterpolation(context) {
    const [open, close] = ["{{", "}}"];
    const closeIndex = context.source.indexOf(close, open.length);
    if (closeIndex === -1) {
      console.warn("\u6CA1\u6709\u7ED3\u675F}}");
      return;
    }
    const start = getCursor(context);
    advanceBy(context, open.length);
    const innerStart = getCursor(context);
    const innerEnd = getCursor(context);
    const rawContentLength = closeIndex - open.length;
    const rawContent = context.source.slice(0, rawContentLength);
    const preTrimContent = parseTextData(context, rawContentLength);
    const content = preTrimContent.trim();
    const startOffset = preTrimContent.indexOf(content);
    if (startOffset > 0) {
      advancePositionWithMutation(innerStart, rawContent, startOffset);
    }
    const endOffset = startOffset + content.length;
    if (endOffset < rawContentLength) {
      advancePositionWithMutation(innerEnd, rawContent, endOffset);
    }
    advanceBy(context, close.length);
    return {
      type: 5 /* INTERPOLATION */,
      content: {
        type: 4 /* SIMPLE_EXPRESSION */,
        content,
        loc: getSelection(context, innerStart, innerEnd)
      },
      col: getSelection(context, start)
    };
  }
  function parseElement(context) {
    const element = parseTag(context, TagType.Start);
    if (element.isSelfClosing) {
      return element;
    }
    const children = parseChildren(context);
    element.children = children;
    if (startsWithEndTagOpen(context.source, element.tag)) {
      parseTag(context, TagType.End);
    }
    element.loc = getSelection(context, element.loc.start);
    return element;
  }
  var TagType = /* @__PURE__ */ ((TagType2) => {
    TagType2[TagType2["Start"] = 0] = "Start";
    TagType2[TagType2["End"] = 1] = "End";
    return TagType2;
  })(TagType || {});
  function parseTag(context, type) {
    const start = getCursor(context);
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
    const tag = match[1];
    advanceBy(context, match[0].length);
    advanceSpaces(context);
    const props = parseAttributes(context, type);
    let isSelfClosing = false;
    if (context.source.startsWith("/>")) {
      isSelfClosing = true;
    }
    advanceBy(context, isSelfClosing ? 2 : 1);
    if (type === 1 /* End */) {
      return;
    }
    return {
      type: 1 /* ELEMENT */,
      tag,
      props,
      isSelfClosing,
      children: [],
      loc: getSelection(context, start)
    };
  }
  function parseText(context) {
    const endTokens = ["<", "{{"];
    let endIndex = context.source.length;
    for (let i = 0; i < endTokens.length; i++) {
      const index = context.source.indexOf(endTokens[i], 1);
      if (index !== -1 && index < endIndex) {
        endIndex = index;
      }
    }
    const start = getCursor(context);
    const content = parseTextData(context, endIndex);
    return {
      type: 2 /* TEXT */,
      content,
      loc: getSelection(context, start)
    };
  }
  function parseTextData(context, length) {
    const rawText = context.source.slice(0, length);
    advanceBy(context, length);
    return rawText;
  }
  function parseAttributes(context, type) {
    if (type === 1 /* End */) {
      return;
    }
    const props = [];
    while (context.source.length > 0 && !context.source.startsWith(">") && !context.source.startsWith("/>")) {
      const attr = parseAttribute(context);
      props.push(attr);
      advanceSpaces(context);
    }
    return props;
  }
  function parseAttribute(context) {
    const start = getCursor(context);
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    const name = match[0];
    advanceBy(context, name.length);
    let value;
    if (/^[\t\r\n\f ]*=/.test(context.source)) {
      advanceSpaces(context);
      advanceBy(context, 1);
      advanceSpaces(context);
      value = parseAttributeValue(context);
    }
    return {
      type: 6 /* ATTRIBUTE */,
      name,
      value: value && {
        type: 2 /* TEXT */,
        content: value.content,
        loc: value.loc
      },
      loc: getSelection(context, start)
    };
  }
  function parseAttributeValue(context) {
    const start = getCursor(context);
    let content;
    const quote = context.source[0];
    const isQuoted = quote === `"` || quote === `'`;
    if (isQuoted) {
      advanceBy(context, 1);
      const endIndex = context.source.indexOf(quote);
      content = parseTextData(context, endIndex);
      advanceBy(context, 1);
    }
    return {
      content,
      loc: getSelection(context, start)
    };
  }
  function advanceBy(context, numberOfCharacters) {
    let { source } = context;
    advancePositionWithMutation(context, source, numberOfCharacters);
    context.source = source.slice(numberOfCharacters);
  }
  function advanceSpaces(context) {
    const match = /^[\t\r\n\f ]+/.exec(context.source);
    if (match) {
      advanceBy(context, match[0].length);
    }
  }
  function getSelection(context, start, end) {
    end = end || getCursor(context);
    return {
      start,
      end,
      source: context.originalSource.slice(start.offset, end.offset)
    };
  }
  function getCursor(context) {
    const { line, column, offset } = context;
    return { line, column, offset };
  }
  function isEnd(context) {
    return !context.source || context.source.startsWith("</");
  }
  function startsWithEndTagOpen(source, tag) {
    return source.startsWith("</") && source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() && /[\t\r\n\f />]/.test(source[2 + tag.length] || ">");
  }

  // packages/compiler-core/src/transform.ts
  function createTransformContext(root, { nodeTransform }) {
    const context = {
      root,
      parent: null,
      currentNode: root,
      helpers: /* @__PURE__ */ new Map(),
      helper(name) {
        const count = context.helpers.get(name) || 0;
        context.helpers.set(name, count + 1);
        return name;
      },
      removeHelper(name) {
        const count = context.helpers.get(name);
        if (count) {
          const currentCount = count - 1;
          if (!currentCount) {
            context.helpers.delete(name);
          } else {
            context.helpers.set(name, currentCount);
          }
        }
      },
      nodeTransform
    };
    return context;
  }
  function transform(root, options) {
    const context = createTransformContext(root, options);
    traverseNode(root, context);
    createRootCodegen(root, context);
    root.helpers = [...context.helpers.keys()];
  }
  function createRootCodegen(root, context) {
    const { children } = root;
    if (children.length === 1) {
      const child = children[0];
      if (isSingleElementRoot(root, child) && child.codegenNode) {
        const codegenNode = child.codegenNode;
        if (codegenNode.type === 13 /* VNODE_CALL */) {
          makeBlock(codegenNode, context);
        }
        root.codegenNode = codegenNode;
      } else {
        root.codegenNode = child;
      }
    } else if (children.length > 1) {
      root.codegenNode = createVNodeCall(context, context.helper(FRAGMENT), null, children);
    }
  }
  function isSingleElementRoot(root, child) {
    const { children } = root;
    return children.length === 1 && child.type === 1 /* ELEMENT */;
  }
  function traverseNode(node, context) {
    context.currentNode = node;
    const { nodeTransform } = context;
    const exitFns = [];
    for (let i2 = 0; i2 < nodeTransform.length; i2++) {
      const onExit = nodeTransform[i2](node, context);
      if (onExit) {
        exitFns.push(onExit);
      }
      if (!context.currentNode) {
        return;
      } else {
        node = context.currentNode;
      }
    }
    switch (node.type) {
      case 5 /* INTERPOLATION */:
        context.helper(TO_DISPLAY_STRING);
        break;
      case 1 /* ELEMENT */:
      case 0 /* ROOT */:
        traverseChildren(node, context);
        break;
    }
    context.currentNode = node;
    let i = exitFns.length;
    while (i--) {
      exitFns[i]();
    }
  }
  function traverseChildren(parent, context) {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      child.parent = parent;
      traverseNode(child, context);
    }
  }

  // packages/compiler-core/src/transform/transformElement.ts
  function transformElement(node, context) {
    return function postTransformElement() {
      if (node.type !== 1 /* ELEMENT */) {
        return;
      }
      const { tag, props } = node;
      let vnodeTag = `"${tag}"`;
      let properties = [];
      if (props.length > 0) {
        for (let i = 0; i < props.length; i++) {
          const prop = props[i];
          if (prop.type === 6 /* ATTRIBUTE */) {
            const { name, value } = prop;
            properties.push({
              key: name,
              value: value ? value.content ? value.content : "" : true
            });
          }
        }
      }
      const propsExpression = properties.length > 0 ? createObjectExpression(properties) : null;
      let vnodeChildren = null;
      if (node.children.length > 0) {
        if (node.children.length === 1) {
          vnodeChildren = node.children[0];
        } else if (node.children.length > 1) {
          vnodeChildren = node.children;
        }
      }
      node.codegenNode = createVNodeCall(context, vnodeTag, propsExpression, vnodeChildren);
    };
  }

  // packages/compiler-core/src/transform/transformExpression.ts
  var transformExpression = (node, context) => {
    if (node.type === 5 /* INTERPOLATION */) {
      const raw = node.content.content;
      node.content.content = `_ctx.${raw}`;
    }
  };

  // packages/compiler-core/src/transform/transformText.ts
  function transformText(node, context) {
    if (node.type === 0 /* ROOT */ || node.type === 1 /* ELEMENT */) {
      return () => {
        const children = node.children;
        let currentContainer;
        let hasText = false;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (isText(child)) {
            hasText = true;
            for (let j = i + 1; j < children.length; j++) {
              const next = children[j];
              if (isText(next)) {
                if (!currentContainer) {
                  currentContainer = children[i] = createCompoundExpression([child], child.loc);
                }
                currentContainer.children.push("+", next);
                children.splice(j, 1);
                j--;
              } else {
                currentContainer = null;
                break;
              }
            }
          }
        }
        if (!hasText || children.length === 1) {
          return;
        }
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (isText(child) || child.type === 8 /* COMPOUND_EXPRESSION */) {
            const callArgs = [];
            callArgs.push(child);
            if (child.type !== 2 /* TEXT */) {
              callArgs.push(1 /* TEXT */ + "");
            }
            children[i] = {
              type: 12 /* TEXT_CALL */,
              content: child,
              loc: child.loc,
              codegenNode: createCallExpression(context.helper(CREATE_TEXT), callArgs)
            };
          }
        }
      };
    }
  }

  // packages/compiler-core/src/compile.ts
  function compile(template) {
    const ast = isString(template) ? parse(template) : template;
    const nodeTransform = [transformExpression, transformElement, transformText];
    transform(ast, { nodeTransform });
    console.log("\u{1F680} ~ file: compile.ts ~ line 19 ~ compile ~ ast", ast);
    return generate(ast);
  }
  return __toCommonJS(src_exports);
})();
//# sourceMappingURL=compiler-core.global.js.map
