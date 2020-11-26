
const operators = ['+', '·', '×', '⊗'];
const braces = ['(', ')'];


const getPriorBySymbol = (symbol: string) => {
    if (symbol === operators[0]) {
        return 1;
    }
    return 2;
}

interface operator {
    symbol: string,
    index: number,
    prior: number
}

enum NodeType {
    Operator,
    Scalar,
    Vector,
    Tensor
}

const isDigit = (char: string): boolean => (!isNaN(Number(char)));
const isBrace = (char: string): boolean => (braces.includes(char));
const isOperator = (char: string): boolean => (operators.includes(char));

const isLowerCase = (char: string) => {
    if (char === undefined) {
        return false;
    }
    return (char === char.toLowerCase());
}

const isUpperCase = (char: string) => {
    if (char === undefined) {
        return false;
    }
    return (char === char.toUpperCase());
}

class TensorNode {
    symbol: string
    idx: number
    leftChild: TensorNode
    rightChild: TensorNode
    type: NodeType
    op: number;

    constructor(symbol: string, leftChild: TensorNode = null, rightChild: TensorNode = null,
        op: number = null) {
        this.symbol = symbol;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.op = op;

        if (isOperator(symbol)) {
            this.type = NodeType.Operator;
        } else {
            if (isDigit(symbol)) {
                this.type = NodeType.Scalar;
            } else {
                if (isLowerCase(symbol)) {
                    this.type = NodeType.Vector;
                }
                if (isUpperCase(symbol)) {
                    this.type = NodeType.Tensor;
                }
            }
        }
    }

}


/*
Проставляем пропущенные знаки тензорного произведения
Возвращаем список токенов из исходной строки:

'3a+5b' ==> ['3', '⊗', 'a', '+', '5', '⊗', 'b']
*/
function splitByTokens(stringToParse: string): Array<string> {
    const tokens = [];

    let prev = '⊗';
    let digitTmp = '';
    for (let i = 0; i < stringToParse.length; i++) {
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
    return tokens
}



function getTheLeastPrioriteOperator(tokens: Array<string>): operator {
    let cur = 0;
    const arr: Array<operator> = [];
    for (let i = 0; i < tokens.length; i++) {
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
            })
        } else {
            if (isOperator(tokens[i])) {
                arr.push({
                    index: i,
                    symbol: tokens[i],
                    prior: cur + 2
                })
            }
        }
    }
    const sortedArray = arr.sort((a: operator, b: operator) => a.prior - b.prior);
    return sortedArray[0];
}

function parseTree(tokens: Array<string>, level: number = 0): TensorNode {
    if (tokens.length === 1) {
        return new TensorNode(tokens[0]);
    }

    const tmp = [];
    let flag = false;
    for (let i = 0; i < tokens.length; i++) {
        if (isBrace(tokens[i])) {
            continue;
        }
        if (isOperator(tokens[i])) {
            flag = true;
        } else {
            tmp.push(tokens[i]);
        }
    }
    if (!flag) {
        if (tmp.length == 0) {
            return null;
        }
        return new TensorNode(tmp[0]);
    }
    const op: operator = getTheLeastPrioriteOperator(tokens);
    return new TensorNode(op.symbol,
        parseTree(tokens.slice(0, op.index), level + 1),
        parseTree(tokens.slice(op.index + 1, tokens.length), level + 1), level);
}



function treeToString(tree: TensorNode): string {
    if (tree == null) {
        return '';
    }
    if ((tree.leftChild == null) && (tree.rightChild == null)) {
        return tree.symbol;
    }


    let leftString = treeToString(tree.leftChild);
    let rightString = treeToString(tree.rightChild);

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
function extractScalar(tree: TensorNode): TensorNode {
    if (tree.symbol != '⊗') return tree;

    if (tree.leftChild.type == NodeType.Scalar) {
        if (tree.rightChild.leftChild != null) {
            if (tree.rightChild.leftChild.type == NodeType.Scalar) {
                return new TensorNode(tree.symbol,
                    new TensorNode(String(Number(tree.leftChild.symbol) *
                        Number(tree.rightChild.leftChild.symbol))),
                    tree.rightChild.rightChild,
                    tree.op);
            }
        }
        if (tree.rightChild.rightChild != null) {
            if (tree.rightChild.rightChild.type == NodeType.Scalar) {
                return new TensorNode(tree.symbol,
                    new TensorNode(String(Number(tree.leftChild.symbol) *
                        Number(tree.rightChild.rightChild.symbol))),
                    tree.rightChild.leftChild,
                    tree.op);
            }
        }
    }
    return tree;
}

/*
Преобразование вида (scalar⊗scalar) ==> (scalar)
*/
function combineScalar(tree: TensorNode): TensorNode {
    if (tree.symbol === '⊗') {
        if ((tree.leftChild.type == NodeType.Scalar) &&
            (tree.rightChild.type == NodeType.Scalar)) {
            return new TensorNode(
                String(
                    Number(tree.leftChild.symbol) *
                    Number(tree.rightChild.symbol)),
            );
        }
    }
    return tree;
}


function flatTree(tree: TensorNode): Array<TensorNode> {

    if (tree === null) return [];

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
function treeFromFlat(stack: Array<TensorNode>): TensorNode {
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
function distrib(tree: TensorNode): TensorNode {
    if ((tree == null) || (tree.symbol != '+')) {
        return tree;
    }

    const flattedTree = flatTree(tree);


    //Дистрибутивность справа

    let rightMult = null;
    let rightLeftMult = null;
    if (flattedTree[0].rightChild == null) {
        rightMult = flattedTree[0];
        rightLeftMult = 1;
    } else {
        rightMult = flattedTree[0].rightChild;
        rightLeftMult = flattedTree[0].leftChild;
    }


    for (let i = 1; i < flattedTree.length; i++) {
        const k = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].rightChild;
        if (equalTree(rightMult, k)) {
            const lk = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].leftChild;
            flattedTree.splice(i, 1);
            flattedTree.splice(0, 1);

            if (flattedTree.length != 0) {
                return new TensorNode('+',
                    new TensorNode('⊗',
                        new TensorNode('+',
                            lk,
                            rightLeftMult,
                            (tree.op == null) ? null : tree.op),
                        rightMult,
                        (tree.op == null) ? null : tree.op + 1),
                    treeFromFlat(flattedTree),
                    (tree.op == null) ? null : tree.op);

            } else {
                return new TensorNode('⊗',
                    new TensorNode('+',
                        lk,
                        rightLeftMult,
                        (tree.op == null) ? null : tree.op
                    ),
                    rightMult,
                    (tree.op == null) ? null : tree.op + 1);
            }
        }
    }


    //Дистрибутивность слева


    let leftMult = null;
    let leftRightMult = null;
    if (flattedTree[0].leftChild == null) {
        leftMult = flattedTree[0];
        leftRightMult = 1;
    } else {
        leftMult = flattedTree[0].leftChild;
        leftRightMult = flattedTree[0].rightChild;
    }


    for (let i = 1; i < flattedTree.length; i++) {
        const k = flattedTree[i].leftChild == null ? flattedTree[i] : flattedTree[i].leftChild;
        if (equalTree(leftMult, k)) {
            const lk = flattedTree[i].rightChild == null ? flattedTree[i] : flattedTree[i].rightChild;
            flattedTree.splice(i, 1);
            flattedTree.splice(0, 1);

            if (flattedTree.length != 0) {
                return new TensorNode('+',
                    new TensorNode('⊗',
                        leftMult,
                        new TensorNode('+',
                            lk,
                            leftRightMult,
                            (tree.op == null) ? null : tree.op),
                        (tree.op == null) ? null : tree.op + 1),
                    treeFromFlat(flattedTree),
                    (tree.op == null) ? null : tree.op);

            } else {
                return new TensorNode('⊗',
                    leftMult,
                    new TensorNode('+',
                        lk,
                        leftRightMult,
                        (tree.op == null) ? null : tree.op
                    ),
                    (tree.op == null) ? null : tree.op + 1);
            }
        }
    }


    return tree;
}


/*
Раскрытие скобок
*/
function expand(tree: TensorNode): TensorNode {

    if ((tree.symbol === '+') || (!isOperator(tree.symbol))) {
        return tree;
    }

    const leftTreeStack = flatTree(tree.leftChild);
    const rightTreeStack = flatTree(tree.rightChild);

    let newStack = [];
    leftTreeStack.forEach(nodeA => {
        rightTreeStack.forEach(nodeB => {
            newStack.push(new TensorNode(tree.symbol, nodeA, nodeB, tree.op));
        });
    });

    return treeFromFlat(newStack);
}


/*
Рекурсивная проверка на абсолютное равенство
*/
function equalTree(treeA: TensorNode, treeB: TensorNode): boolean {

    if ((treeA === null) || (treeB === null)) return false;

    if ((treeA.leftChild == null) && (treeB.rightChild == null)) {
        return (treeA.symbol === treeB.symbol);
    }

    return ((equalTree(treeA.leftChild, treeB.leftChild)) &&
        (equalTree(treeA.rightChild, treeB.rightChild)));
}


function sumOperatorForScalars(tree: TensorNode): TensorNode {
    if ((tree.symbol == null) || (tree.symbol != "+")) {
        return tree;
    }
    if ((tree.leftChild != null) && (tree.rightChild != null)) {

        if ((tree.leftChild.type === NodeType.Scalar) &&
            (tree.rightChild.type === NodeType.Scalar)) {
            return new TensorNode(String(
                Number(tree.leftChild.symbol) +
                Number(tree.rightChild.symbol)
            ));
        }

        if ((tree.leftChild.type === NodeType.Scalar) &&
            (tree.rightChild.symbol === '+')) {
            return new TensorNode(
                String(
                    Number(tree.leftChild.symbol)) +
                Number(sumOperatorForScalars(tree.rightChild).symbol)
            );
        }
    }
    return tree;
}


/*
Последовательно применяем переданную функцию ко всем узлам дерева, 
начиная с самых нижних
*/
function checkForAll(tree: TensorNode, fun: (a: TensorNode) => TensorNode): TensorNode {
    if (tree == null) return null;

    return fun(new TensorNode(tree.symbol,
        checkForAll(tree.leftChild, fun), checkForAll(tree.rightChild, fun),
        tree.op));
}

function testDistrib(stringToParse: string) {
    const a = splitByTokens(stringToParse);
    let b = parseTree(a);
    b = checkForAll(b, distrib);
    b = checkForAll(b, sumOperatorForScalars);
    console.log(treeToString(b));
}

export default function test(stringToParse: string): string {
    const a = splitByTokens(stringToParse);
    let b = parseTree(a);
    b = checkForAll(b, extractScalar);
    b = checkForAll(b, combineScalar);
    b = checkForAll(b, sumOperatorForScalars);
    b = extractScalar(b);
    b = checkForAll(b, expand);
    b = checkForAll(b, distrib);
    console.log(treeToString(b));
    return treeToString(b);
}

test('(2+2)');
test('(3⊗2⊗3)');
test('(4+4⊗2)');
test('(2+2⊗2+2)');
test('((a+b)·(c+d+e))');
test('((2+4)⊗(a+b))')
test('(2⊗(3⊗(4a·b)))');
test('(3⊗b⊗2)');

test('(10ab+4ab+5cd+10cd)')
test('(3a+3b+3a+4b+1a');

test('(1+3)+3)⊗a+(4+3)⊗b')
testDistrib('3a+3b+3b')