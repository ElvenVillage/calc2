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

const typeBySymbol = (symbol: string): NodeType => {
    if (isOperator(symbol)) {
        return NodeType.Operator;
    } else {
        if (isDigit(symbol)) {
            return NodeType.Scalar;
        } else {
            if (isLowerCase(symbol)) {
                return NodeType.Vector;
            }
            if (isUpperCase(symbol)) {
                return NodeType.Tensor;
            }
        }
    }
}

class TensorNode {
    symbol: string;
    leftChild: TensorNode;
    rightChild: TensorNode;
    type: NodeType;
    op: number;

    constructor(symbol: string, leftChild: TensorNode = null, rightChild: TensorNode = null,
                op: number = null) {
        this.symbol = symbol;
        this.leftChild = leftChild;
        this.rightChild = rightChild;
        this.op = op;

        this.type = typeBySymbol(symbol);
    }

}

class FlatTree {
    rootSymbol: string;
    type: NodeType;
    children: Array<FlatTree>;
    op: number;

    constructor(rootSymbol: string, children: Array<FlatTree> = [], op: number = 0) {
        this.rootSymbol = rootSymbol;
        this.children = children;
        this.op = op;

        this.type = typeBySymbol(rootSymbol);
    }
}

/*
Проставляем пропущенные знаки тензорного произведения
Возвращаем список токенов из исходной строки:

'3a+5b' ==> ['3', '⊗', 'a', '+', '5', '⊗', 'b']
*/
function splitByTokens(stringToParse: string): Array<string> {

    if ((!isBrace(stringToParse[0])) || (!isBrace(stringToParse[stringToParse.length - 1]))) {
        stringToParse = '(' + stringToParse + ')';
    }

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


function getTheLeastPriorityOperator(tokens: Array<string>): operator {
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
    const op: operator = getTheLeastPriorityOperator(tokens);
    return new TensorNode(op.symbol,
        parseTree(tokens.slice(0, op.index), level + 1),
        parseTree(tokens.slice(op.index + 1, tokens.length), level + 1), level);
}

/*
Рекурсивная проверка на равенство двух узлов дерева, не учитывает коммутативность сложения!
 */
function equalFlatTree(A: FlatTree, B: FlatTree): boolean {
    if ((!A) || (!B)) return false;
    if (A.rootSymbol === B.rootSymbol) {
        if (A.children.length === B.children.length) {
            if (A.children.length === 0) return true;
        }
        return !(A.children.map((aChild, idx) => equalFlatTree(aChild, B.children[idx])).includes(false));
    }
    return false;
}

function flatTree(tree: TensorNode, level = 0): FlatTree {

    if (tree === null) return null;

    if ((tree.leftChild == null) && (tree.rightChild == null)) {
        return new FlatTree(tree.symbol, [], level)
    }

    const tmpLeftChild = [tree.leftChild];
    let flag = true;
    while (flag) {
        flag = false;
        for (let i = 0; i < tmpLeftChild.length; i++) {
            if (tmpLeftChild[i].symbol === tree.symbol) {
                const tL = tmpLeftChild[i].leftChild;
                const tR = tmpLeftChild[i].rightChild;
                tmpLeftChild[i] = tL;
                tmpLeftChild.splice(i, 0, tR);
                flag = true;
            }
        }
    }
    const leftPart = tmpLeftChild.map(c => flatTree(c, level + 1));

    const tmpRightChild = [tree.rightChild];
    flag = true;
    while (flag) {
        flag = false;
        for (let i = 0; i < tmpRightChild.length; i++) {
            if (tmpRightChild[i].symbol === tree.symbol) {
                const tL = tmpRightChild[i].leftChild;
                const tR = tmpRightChild[i].rightChild;
                tmpRightChild[i] = tL;
                tmpRightChild.splice(i, 0, tR);
                flag = true;
            }
        }
    }
    const rightPart = tmpRightChild.map(c => flatTree(c, level + 1));

    return new FlatTree(
        tree.symbol,
        leftPart.concat(rightPart.reverse()),
        level
    );
}

function flatTreeToString(tree: FlatTree): string {

    if (tree === null) return '';

    if (tree.children.length === 0) {
        return tree.rootSymbol;
    }

    const childrenStrings = tree.children.map(child => flatTreeToString(child));
    childrenStrings.forEach((_str, idx) => {
        if ((tree.children[idx].op > tree.op)
            && (getPriorBySymbol(tree.rootSymbol) > getPriorBySymbol(tree.children[idx].rootSymbol))) {
            childrenStrings[idx] = '(' + childrenStrings[idx] + ')';
        }
    })
    return childrenStrings.join(tree.rootSymbol);
}


/*
Выносим скаляры в начало записи
*/
function extractScalar(tree: FlatTree): FlatTree {
    if (tree.rootSymbol != '⊗') return tree;

    const newChildren: Array<FlatTree> = [];
    let scalar: number = 1;
    let counterOfScalars = 0;

    tree.children.forEach(child => {
        if (child.type != NodeType.Scalar) {
            newChildren.push(child);
        } else {
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
function expand(tree: FlatTree): FlatTree {

    if (tree.children.length === 0) {
        return tree;
    }

    let firstSum: FlatTree = null;
    let firstSumIdx = -1;
    for (let i = 0; i < tree.children.length; i++) {
        if (tree.children[i].rootSymbol === '+') {
            firstSum = tree.children[i];
            firstSumIdx = i;
            break;
        }
    }

    if ((firstSum === null) || (firstSumIdx === -1)) {
        return tree;
    }

    const newChildren = firstSum.children.map(sumChild => {
        const multiplicationChildren: Array<FlatTree> = [];

        for (let i = 0; i < tree.children.length; i++) {
            if (i === firstSumIdx) {
                sumChild.op++;
                multiplicationChildren.push(sumChild);
                continue;
            }
            ;
            tree.children[i].op++;
            multiplicationChildren.push(tree.children[i]);
        }
        return new FlatTree(tree.rootSymbol, multiplicationChildren, tree.op);
    });

    return new FlatTree('+', newChildren, tree.op);
}

/*
Вынесение за скобку общих множителей (нет вынесения общего делителя т.к. нет арифметики
рациональных чисел, пока что
 */
function distrib(tree: FlatTree): FlatTree {
    if (tree.children.length === 0) {
        return tree;
    }
    if (tree.rootSymbol != '+') {
        return tree;
    }

    //Правая дистрибутивность 7a + 5a = (7+5) a

    for (let i = 0; i < tree.children.length - 1; i++) {
        const leftChildren: Array<FlatTree> = [];
        const rightChildA = tree.children[i].children[tree.children[i].children.length - 1];
        const excludedIndexes: Array<number> = [];

        let leftChildA: FlatTree = null;
        if (tree.children[i].children.length === 2) {
            leftChildA = tree.children[i].children[0];
        } else {
            leftChildA = new FlatTree(
                tree.children[i].rootSymbol,
                tree.children[i].children.slice(0, tree.children[i].children.length - 1),
                tree.children[i].op
            );
        }
        excludedIndexes.push(i)
        leftChildren.push(leftChildA);
        for (let j = i + 1; j < tree.children.length; j++) {
            const rightChildB = tree.children[j].children[tree.children[j].children.length - 1];
            if (equalFlatTree(rightChildA, rightChildB)) {
                const leftChildB = new FlatTree(
                    tree.children[j].rootSymbol,
                    tree.children[j].children.slice(0, tree.children[j].children.length - 1),
                    tree.children[j].op
                );
                leftChildren.push(leftChildB);
                excludedIndexes.push(j);
            }
        }
        if (leftChildren.length > 1) {
            if (leftChildren.length === tree.children.length) {
                return new FlatTree(
                    tree.children[i].rootSymbol,
                    [
                        new FlatTree('+', leftChildren, tree.op + 1),
                        rightChildA
                    ],
                    tree.op
                );
            } else {
                return new FlatTree(
                    '+',
                    [
                        new FlatTree(
                            tree.children[i].rootSymbol,
                            [
                                new FlatTree(
                                    '+',
                                    leftChildren,
                                    tree.op + 2
                                ),
                                rightChildA
                            ],
                            tree.op + 1
                        ),
                        ...tree.children.filter((_v, idx) => !excludedIndexes.includes(idx))
                    ],
                    tree.op
                );
            }
        }
    }

    //Левая дистрибутивность 5a + 5b = 5 (a+b)


    for (let i = 0; i < tree.children.length - 1; i++) {
        const rightChildren: Array<FlatTree> = [];
        const leftChildA = tree.children[i].children[0];
        const excludedIndexes: Array<number> = [];

        let rightChildA: FlatTree = null;
        if (tree.children[i].children.length === 2) {
            rightChildA = tree.children[i].children[tree.children[i].children.length-1];
        } else {
            rightChildA = new FlatTree(
                tree.children[i].rootSymbol,
                tree.children[i].children.slice(tree.children[i].children.length - 1),
                tree.children[i].op
            );
        }
        excludedIndexes.push(i)
        rightChildren.push(rightChildA);
        for (let j = i + 1; j < tree.children.length; j++) {
            const leftChildB = tree.children[j].children[0];
            if (equalFlatTree(leftChildA, leftChildB)) {
                const rightChildB = new FlatTree(
                    tree.children[j].rootSymbol,
                    tree.children[j].children.slice(tree.children[j].children.length - 1),
                    tree.children[j].op
                );
                rightChildren.push(rightChildB);
                excludedIndexes.push(j);
            }
        }
        if (rightChildren.length > 1) {
            if (rightChildren.length === tree.children.length) {
                return new FlatTree(
                    tree.children[i].rootSymbol,
                    [
                        leftChildA,
                        new FlatTree('+', rightChildren, tree.op + 1),
                    ],
                    tree.op
                );
            } else {
                return new FlatTree(
                    '+',
                    [
                        new FlatTree(
                            tree.children[i].rootSymbol,
                            [
                                leftChildA,
                                new FlatTree(
                                    '+',
                                    rightChildren,
                                    tree.op + 2
                                )
                            ],
                            tree.op + 1
                        ),
                        ...tree.children.filter((_v, idx) => !excludedIndexes.includes(idx))
                    ],
                    tree.op
                );
            }
        }
    }

    return tree;
}


function sumOperatorForScalars(tree: FlatTree): FlatTree {
    if ((tree.rootSymbol == null) || (tree.rootSymbol != "+")) {
        return tree;
    }

    let sum = 0;
    let countOfInc = 0;
    const newChildren = [];

    tree.children.forEach(child => {
        if (child.type === NodeType.Scalar) {
            sum += Number(child.rootSymbol);
            countOfInc++;
        } else {
            newChildren.push(child);
        }
    });

    if (countOfInc === tree.children.length) {
        return new FlatTree(String(sum), [], tree.op);
    }

    if (countOfInc > 1) {
        newChildren.unshift(new FlatTree(
            String(sum), [], tree.op + 1
        ));
        return new FlatTree(tree.rootSymbol, newChildren, tree.op);
    }
    return tree;
}

/*
Последовательно применяем переданную функцию ко всем узлам дерева, 
начиная с самых нижних
*/
function checkForAll(tree: FlatTree, fun: (a: FlatTree) => FlatTree): FlatTree {
    if (tree == null) return null;

    return fun(new FlatTree(tree.rootSymbol,
        tree.children.map(fun).map(c => checkForAll(c, fun)),
        tree.op));
}


function evalExpression(inputString: string): string {
    const history = [inputString];

    for (let i = 0; i < 200; i++) {
        let a = splitByTokens(history[history.length - 1]);
        let b = parseTree(a);
        let c = flatTree(b);

        c = checkForAll(c, distrib);
        c = checkForAll(c, extractScalar);
        c = checkForAll(c, sumOperatorForScalars);
        const outString = flatTreeToString(c);

        if (history.includes(outString)) {
            console.log(inputString + '=' + outString);
            return outString;
        }

        history.push(outString);
    }
}

evalExpression('2+2');
evalExpression('3⊗2⊗3');
evalExpression('4+4⊗2');
evalExpression('2+2⊗2+2');
evalExpression('(a+b)·(c+d+e)');
evalExpression('(2+4)⊗(a+b)');
evalExpression('2⊗(3⊗(4a·b))');
evalExpression('3⊗b⊗2');

evalExpression('10ab+4ab+5cd+10cd');
evalExpression('3a+3b+3a+4b+1a');
evalExpression('c·b+d+a·b');

evalExpression('(1+3)+3)⊗a+(4+3)⊗b');
evalExpression('3a+3b+3b');
evalExpression('(a+b)⊗(c+d)⊗(e+f)');
evalExpression('5b+6a+6a');
evalExpression('6a+5b+7a+8b');