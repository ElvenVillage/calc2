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
var TensorNode = /** @class */ (function () {
    function TensorNode(symbol, leftChild, rightChild, op) {
        if (leftChild === void 0) { leftChild = null; }
        if (rightChild === void 0) { rightChild = null; }
        if (op === void 0) { op = null; }
        this.symbol = symbol;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.op = op;
        if (isOperator(symbol)) {
            this.type = NodeType.Operator;
        }
        else {
            if (isDigit(symbol)) {
                this.type = NodeType.Scalar;
            }
            else {
                if (isLowerCase(symbol)) {
                    this.type = NodeType.Vector;
                }
                if (isUpperCase(symbol)) {
                    this.type = NodeType.Tensor;
                }
            }
        }
    }
    return TensorNode;
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
/*
Преобразование вида scalar(scalar ·×⊗ any) ==> (scalar⊗scalar) ·×⊗ any
*/
function extractScalar(tree) {
    if (tree.symbol != '⊗')
        return tree;
    if (tree.leftChild.type == NodeType.Scalar) {
        if (tree.rightChild.leftChild != null) {
            if (tree.rightChild.leftChild.type == NodeType.Scalar) {
                return new TensorNode(tree.symbol, new TensorNode(String(Number(tree.leftChild.symbol) *
                    Number(tree.rightChild.leftChild.symbol))), tree.rightChild.rightChild, tree.op);
            }
        }
        if (tree.rightChild.rightChild != null) {
            if (tree.rightChild.rightChild.type == NodeType.Scalar) {
                return new TensorNode(tree.symbol, new TensorNode(String(Number(tree.leftChild.symbol) *
                    Number(tree.rightChild.rightChild.symbol))), tree.rightChild.leftChild, tree.op);
            }
        }
    }
    return tree;
}
/*
Преобразование вида (scalar⊗scalar) ==> (scalar)
*/
function combineScalar(tree) {
    if (tree.symbol === '⊗') {
        if ((tree.leftChild.type == NodeType.Scalar) &&
            (tree.rightChild.type == NodeType.Scalar)) {
            return new TensorNode(String(Number(tree.leftChild.symbol) *
                Number(tree.rightChild.symbol)));
        }
    }
    return tree;
}
function flatTree(tree) {
    if (tree === null)
        return [];
    if (tree.symbol != '+') {
        return [tree];
    }
    if (tree.op == null) {
        return [tree];
    }
    if (tree.symbol === '+') {
        return flatTree(tree.leftChild).concat(flatTree(tree.rightChild));
    }
}
/*
Дерево из плоского списка
*/
function treeFromFlat(stack) {
    if (stack.length < 1) {
        return null;
    }
    if (stack.length === 1) {
        return stack[0];
    }
    return new TensorNode('+', stack[0], treeFromFlat(stack.slice(1, stack.length)), 100);
}
/*
Вынесение за скобку подобных
*/
function distrib(tree) {
    if ((tree == null) || (tree.symbol != '+')) {
        return tree;
    }
    var flattedTree = flatTree(tree);
    //Дистрибутивность справа
    var rightMult = null;
    var rightLeftMult = null;
    if (flattedTree[0].rightChild == null) {
        rightMult = flattedTree[0];
        rightLeftMult = 1;
    }
    else {
        rightMult = flattedTree[0].rightChild;
        rightLeftMult = flattedTree[0].leftChild;
    }
    for (var i = 1; i < flattedTree.length; i++) {
        var k = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].rightChild;
        if (equalTree(rightMult, k)) {
            var lk = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].leftChild;
            flattedTree.splice(i, 1);
            flattedTree.splice(0, 1);
            if (flattedTree.length != 0) {
                return new TensorNode('+', new TensorNode('⊗', new TensorNode('+', lk, rightLeftMult, (tree.op == null) ? null : tree.op), rightMult, (tree.op == null) ? null : tree.op + 1), treeFromFlat(flattedTree), (tree.op == null) ? null : tree.op);
            }
            else {
                return new TensorNode('⊗', new TensorNode('+', lk, rightLeftMult, (tree.op == null) ? null : tree.op), rightMult, (tree.op == null) ? null : tree.op + 1);
            }
        }
    }
    //Дистрибутивность слева
    var leftMult = null;
    var leftRightMult = null;
    if (flattedTree[0].leftChild == null) {
        leftMult = flattedTree[0];
        leftRightMult = 1;
    }
    else {
        leftMult = flattedTree[0].leftChild;
        leftRightMult = flattedTree[0].rightChild;
    }
    for (var i = 1; i < flattedTree.length; i++) {
        var k = flattedTree[i].leftChild == null ? flattedTree[i] : flattedTree[i].leftChild;
        if (equalTree(leftMult, k)) {
            var lk = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].rightChild;
            flattedTree.splice(i, 1);
            flattedTree.splice(0, 1);
            if (flattedTree.length != 0) {
                return new TensorNode('+', new TensorNode('⊗', leftMult, new TensorNode('+', lk, leftRightMult, (tree.op == null) ? null : tree.op), (tree.op == null) ? null : tree.op + 1), treeFromFlat(flattedTree), (tree.op == null) ? null : tree.op);
            }
            else {
                return new TensorNode('⊗', leftMult, new TensorNode('+', lk, leftRightMult, (tree.op == null) ? null : tree.op), (tree.op == null) ? null : tree.op + 1);
            }
        }
    }
    return tree;
}
/*
Раскрытие скобок
*/
function expand(tree) {
    if ((tree.symbol === '+') || (!isOperator(tree.symbol))) {
        return tree;
    }
    var leftTreeStack = flatTree(tree.leftChild);
    var rightTreeStack = flatTree(tree.rightChild);
    var newStack = [];
    leftTreeStack.forEach(function (nodeA) {
        rightTreeStack.forEach(function (nodeB) {
            newStack.push(new TensorNode(tree.symbol, nodeA, nodeB, tree.op));
        });
    });
    return treeFromFlat(newStack);
}
/*
Рекурсивная проверка на абсолютное равенство
*/
function equalTree(treeA, treeB) {
    if ((treeA === null) || (treeB === null))
        return false;
    if ((treeA.leftChild == null) && (treeB.rightChild == null)) {
        return (treeA.symbol === treeB.symbol);
    }
    return ((equalTree(treeA.leftChild, treeB.leftChild)) &&
        (equalTree(treeA.rightChild, treeB.rightChild)));
}
function sumOperatorForScalars(tree) {
    if ((tree.symbol == null) || (tree.symbol != "+")) {
        return tree;
    }
    if ((tree.leftChild != null) && (tree.rightChild != null)) {
        if ((tree.leftChild.type === NodeType.Scalar) &&
            (tree.rightChild.type === NodeType.Scalar)) {
            return new TensorNode(String(Number(tree.leftChild.symbol) +
                Number(tree.rightChild.symbol)));
        }
        if ((tree.leftChild.type === NodeType.Scalar) &&
            (tree.rightChild.symbol === '+')) {
            return new TensorNode(String(Number(tree.leftChild.symbol)) +
                Number(sumOperatorForScalars(tree.rightChild).symbol));
        }
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
    return fun(new TensorNode(tree.symbol, checkForAll(tree.leftChild, fun), checkForAll(tree.rightChild, fun), tree.op));
}
function testDistrib(stringToParse) {
    var a = splitByTokens(stringToParse);
    var b = parseTree(a);
    b = checkForAll(b, distrib);
    b = checkForAll(b, sumOperatorForScalars);
    console.log(treeToString(b));
}
function test(stringToParse) {
    var a = splitByTokens(stringToParse);
    var b = parseTree(a);
    b = checkForAll(b, extractScalar);
    b = checkForAll(b, combineScalar);
    b = checkForAll(b, sumOperatorForScalars);
    b = extractScalar(b);
    b = checkForAll(b, expand);
    b = checkForAll(b, distrib);
    console.log(treeToString(b));
    return treeToString(b);
}
exports["default"] = test;
test('(2+2)');
test('(3⊗2⊗3)');
test('(4+4⊗2)');
test('(2+2⊗2+2)');
test('((a+b)·(c+d+e))');
test('((2+4)⊗(a+b))');
test('(2⊗(3⊗(4a·b)))');
test('(3⊗b⊗2)');
test('(10ab+4ab+5cd+10cd)');
test('(3a+3b+3a+4b+1a');
test('(1+3)+3)⊗a+(4+3)⊗b');
testDistrib('3a+3b+3b');
