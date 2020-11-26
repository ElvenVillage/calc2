"use strict";
exports.__esModule = true;
var operators = ['+', '·', '×', '⊗'];
var braces = ['(', ')'];
var getPriorBySymbol = function (symbol) {
    if (symbol === operators[0]) {
        return 1;
    }
    return 2;
};
var NodeType;
(function (NodeType) {
    NodeType[NodeType["Operator"] = 0] = "Operator";
    NodeType[NodeType["Scalar"] = 1] = "Scalar";
    NodeType[NodeType["Vector"] = 2] = "Vector";
    NodeType[NodeType["Tensor"] = 3] = "Tensor";
})(NodeType || (NodeType = {}));
var isDigit = function (char) { return (!isNaN(Number(char))); };
var isBrace = function (char) { return (braces.includes(char)); };
var isOperator = function (char) { return (operators.includes(char)); };
var isLowerCase = function (char) {
    if (char === undefined) {
        return false;
    }
    return (char === char.toLowerCase());
};
var isUpperCase = function (char) {
    if (char === undefined) {
        return false;
    }
    return (char === char.toUpperCase());
};
var typeBySymbol = function (symbol) {
    if (isOperator(symbol)) {
        return NodeType.Operator;
    }
    else {
        if (isDigit(symbol)) {
            return NodeType.Scalar;
        }
        else {
            if (isLowerCase(symbol)) {
                return NodeType.Vector;
            }
            if (isUpperCase(symbol)) {
                return NodeType.Tensor;
            }
        }
    }
};
var TensorNode = /** @class */ (function () {
    function TensorNode(symbol, leftChild, rightChild, op) {
        if (leftChild === void 0) { leftChild = null; }
        if (rightChild === void 0) { rightChild = null; }
        if (op === void 0) { op = null; }
        this.symbol = symbol;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.op = op;
        this.type = typeBySymbol(symbol);
    }
    return TensorNode;
}());
var FlatTree = /** @class */ (function () {
    function FlatTree(rootSymbol, children, op) {
        if (children === void 0) { children = []; }
        if (op === void 0) { op = 0; }
        this.rootSymbol = rootSymbol;
        this.children = children;
        this.op = op;
        this.type = typeBySymbol(rootSymbol);
    }
    return FlatTree;
}());
/*
Проставляем пропущенные знаки тензорного произведения
Возвращаем список токенов из исходной строки:

'3a+5b' ==> ['3', '⊗', 'a', '+', '5', '⊗', 'b']
*/
function splitByTokens(stringToParse) {
    var tokens = [];
    var prev = '⊗';
    var digitTmp = '';
    for (var i = 0; i < stringToParse.length; i++) {
        if (isDigit(stringToParse[i])) {
            digitTmp += stringToParse[i];
            prev = stringToParse[i];
            continue;
        }
        if (digitTmp != '') {
            tokens.push(digitTmp);
            digitTmp = '';
        }
        if ((!isOperator(stringToParse[i])) && (!isOperator(prev)) && (!isBrace(prev)) && (!isBrace(stringToParse[i]))) {
            tokens.push('⊗');
        }
        tokens.push(stringToParse[i]);
        prev = stringToParse[i];
    }
    return tokens;
}
function getTheLeastPrioriteOperator(tokens) {
    var cur = 0;
    var arr = [];
    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i] === '(') {
            cur += 4;
        }
        if (tokens[i] === ')') {
            cur -= 4;
        }
        if (tokens[i] === '+') {
            arr.push({
                index: i,
                symbol: '+',
                prior: cur + 1
            });
        }
        else {
            if (isOperator(tokens[i])) {
                arr.push({
                    index: i,
                    symbol: tokens[i],
                    prior: cur + 2
                });
            }
        }
    }
    var sortedArray = arr.sort(function (a, b) { return a.prior - b.prior; });
    return sortedArray[0];
}
function parseTree(tokens, level) {
    if (level === void 0) { level = 0; }
    if (tokens.length === 1) {
        return new TensorNode(tokens[0]);
    }
    var tmp = [];
    var flag = false;
    for (var i = 0; i < tokens.length; i++) {
        if (isBrace(tokens[i])) {
            continue;
        }
        if (isOperator(tokens[i])) {
            flag = true;
        }
        else {
            tmp.push(tokens[i]);
        }
    }
    if (!flag) {
        if (tmp.length == 0) {
            return null;
        }
        return new TensorNode(tmp[0]);
    }
    var op = getTheLeastPrioriteOperator(tokens);
    return new TensorNode(op.symbol, parseTree(tokens.slice(0, op.index), level + 1), parseTree(tokens.slice(op.index + 1, tokens.length), level + 1), level);
}
function treeToString(tree) {
    if (tree == null) {
        return '';
    }
    if ((tree.leftChild == null) && (tree.rightChild == null)) {
        return tree.symbol;
    }
    var leftString = treeToString(tree.leftChild);
    var rightString = treeToString(tree.rightChild);
    if (tree.rightChild != null) {
        if ((tree.rightChild.op != null) && (tree.op != null)) {
            if ((tree.op > tree.rightChild.op) &&
                (getPriorBySymbol(tree.symbol) != getPriorBySymbol(tree.rightChild.symbol))) {
                rightString = '(' + rightString + ')';
            }
        }
    }
    if (tree.leftChild != null) {
        if ((tree.leftChild.op != null) && (tree.op != null)) {
            if ((tree.op < tree.leftChild.op) &&
                (getPriorBySymbol(tree.symbol) != getPriorBySymbol(tree.leftChild.symbol))) {
                leftString = '(' + leftString + ')';
            }
        }
    }
    return leftString + tree.symbol + rightString;
}
function flatTree(tree, level) {
    if (level === void 0) { level = 0; }
    if (tree === null)
        return null;
    if ((tree.leftChild == null) && (tree.rightChild == null)) {
        return new FlatTree(tree.symbol, [], level);
    }
    var children = [];
    if (tree.symbol === tree.leftChild.symbol) {
        children = children.concat(Array.of(flatTree(tree.leftChild.leftChild, level + 1), flatTree(tree.leftChild.rightChild, level + 1)));
    }
    else {
        children.push(flatTree(tree.leftChild, level + 1));
    }
    if (tree.symbol === tree.rightChild.symbol) {
        children = children.concat(Array.of(flatTree(tree.rightChild.leftChild, level + 1), flatTree(tree.rightChild.rightChild, level + 1)));
    }
    else {
        children.push(flatTree(tree.rightChild, level + 1));
    }
    return new FlatTree(tree.symbol, children, level + 1);
}
function flatTreeToString(tree) {
    if (tree.children.length === 0) {
        return tree.rootSymbol;
    }
    var childrenStrings = tree.children.map(function (child) { return flatTreeToString(child); });
    childrenStrings.forEach(function (_str, idx) {
        if ((tree.children[idx].op > tree.op)
            && (getPriorBySymbol(tree.rootSymbol) > getPriorBySymbol(tree.children[idx].rootSymbol))) {
            childrenStrings[idx] = '(' + childrenStrings[idx] + ')';
        }
    });
    return childrenStrings.join(tree.rootSymbol);
}
/*
Выносим скаляры в начало записи
*/
function extractScalar(tree) {
    if (tree.rootSymbol != '⊗')
        return tree;
    var newChildren = [];
    var scalar = 1;
    var counterOfScalars = 0;
    tree.children.forEach(function (child) {
        if (child.type != NodeType.Scalar) {
            newChildren.push(child);
        }
        else {
            scalar *= Number(child.rootSymbol);
            counterOfScalars++;
        }
    });
    if (scalar === 1) {
        return tree;
    }
    if (counterOfScalars === tree.children.length) {
        return new FlatTree(String(scalar), [], tree.op);
    }
    newChildren.unshift(new FlatTree(String(scalar)));
    tree.children = newChildren;
    return tree;
}
/*
Раскрытие скобок
*/
function expand(tree) {
    if (tree.children.length === 0) {
        return tree;
    }
    if (((tree.rootSymbol === '+')
        || (!isOperator(tree.rootSymbol)))
        && (tree.children.filter(function (c) { return c.rootSymbol === '+'; }).length > 0)) {
        return tree;
    }
    var newChildren = [];
    if (tree.children[0].children.length === 0) {
        newChildren = tree.children.slice(1).map(function (child) {
            child.op += 1;
            return new FlatTree(tree.rootSymbol, [
                new FlatTree(tree.children[0].rootSymbol, [], tree.op + 1),
                child
            ], tree.op + 1);
        });
    }
    else {
        tree.children[0].children.forEach(function (childA) {
            newChildren = newChildren.concat(tree.children.slice(1).map(function (childB) {
                childA.op += 1;
                childB.op += 1;
                return new FlatTree(tree.rootSymbol, [
                    childA,
                    childB
                ], tree.op + 1);
            }));
        });
    }
    return new FlatTree('+', newChildren, tree.op);
}
function sumOperatorForScalars(tree) {
    if ((tree.rootSymbol == null) || (tree.rootSymbol != "+")) {
        return tree;
    }
    var sum = 0;
    var countOfInc = 0;
    var newChildren = [];
    tree.children.forEach(function (child) {
        if (child.type === NodeType.Scalar) {
            sum += Number(child.rootSymbol);
            countOfInc++;
        }
        else {
            newChildren.push(child);
        }
    });
    if (countOfInc === tree.children.length) {
        return new FlatTree(String(sum), [], tree.op);
    }
    if (sum != 0) {
        newChildren.unshift(new FlatTree(String(sum), [], tree.op + 1));
        return new FlatTree(tree.rootSymbol, newChildren, tree.op);
    }
    return tree;
}
/*
Последовательно применяем переданную функцию ко всем узлам дерева,
начиная с самых нижних
*/
function checkForAll(tree, fun) {
    if (tree == null)
        return null;
    return fun(new FlatTree(tree.rootSymbol, tree.children.map(fun).map(function (funnedChild) { return checkForAll(funnedChild, fun); }), tree.op));
}
function test(stringToParse) {
    var a = splitByTokens(stringToParse);
    var c = parseTree(a);
    var b = flatTree(c);
    b = checkForAll(b, extractScalar);
    b = checkForAll(b, sumOperatorForScalars);
    b = extractScalar(b);
    b = checkForAll(b, expand);
    console.log(flatTreeToString(b));
}
exports["default"] = test;
test('(2+2)');
test('(3⊗2⊗3)');
test('(4+4⊗2)');
test('(2+2⊗2+2)');
test('((a+b)·(c+d+e))');
test('((2+4)⊗(a+b))');
// test('(2⊗(3⊗(4a·b)))');
// test('(3⊗b⊗2)');
// test('(10ab+4ab+5cd+10cd)')
// test('(3a+3b+3a+4b+1a');
// test('(1+3)+3)⊗a+(4+3)⊗b')
// test('3a+3b+3b')
