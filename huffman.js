import PriorityQueue from 'js-priority-queue'

let nodeCounter = 0;

class Node {
    /**
     * @type {number}
     */
    ch = 0;

    /**
     * @type {number}
     */
    freq = 0;
    /**
     * 
     * @param {number} ch 
     * @param {number} freq 
     * @param {Node|undefined} left 
     * @param {Node|undefined} right 
     */
    constructor(ch, freq, left, right) {
        this.hash = nodeCounter++;
        if (!left) {
            left = null;
        }
        if (!right) {
            right = null;
        }

        this.ch = ch;
        this.freq = freq;
        
        this.left = left;
        this.right = right;
    }   
}

/**
 * 
 * @param {Node} root
 * @param {string} str 
 * @param {Map<number,string>} huffmanCode 
 */
function encode(root, str, huffmanCode) {
    if (root == null)
        return;

    // leaf node
    if (root.left == null && root.right == null) {
        huffmanCode[root.ch] = str;
    }

    encode(root.left, str + "0", huffmanCode);
    encode(root.right, str + "1", huffmanCode);
}

function printNode(node, depth, maxDepth, idx) {
    if (!idx) {
        idx = 0;
    }
    if (!depth) {
        depth = 0;
    }
    if (!maxDepth) {
        maxDepth = 0;
    }

    if (node == null) {
        return maxDepth;
    }

    console.log(' '.repeat((depth++)*2), node.ch ? `[${node.ch}]` : '( )', `(${depth-1})`);

    if (depth > maxDepth) {
        maxDepth = depth;
    }

    idx++;

    maxDepth = Math.max(maxDepth, printNode(node.left, depth, maxDepth, idx));

    idx++;

    maxDepth = Math.max(maxDepth, printNode(node.right, depth, maxDepth, idx));

    return maxDepth;
}

/**
 * @param {number[]} values
 * @param {number[]} types
 * @param {Node} root 
 */
 function encodeGraphIteratively(root) {
    const values = [];
    const types = [];

    const q = [root];
    let i = 0;
    while (q.length > 0) {
        const size = q.length;
        //const levelResult = [];

        for (let i = 0; i < size; i++) {
            const node = q.shift();

            if (node.left != null && node.right != null) {
                //levelResult.push('()');    
                types.push(0); 
            } else {
                //levelResult.push(node.ch);
                types.push(1);
                values.push(node.ch);
            };

            if (node.left) {
                q.push(node.left);   
            }
            if (node.right) {
                q.push(node.right);
            }
        }

        //console.log(i, levelResult);
        i++;
    }

    return {
        values: values,
        types: types
    };
}

/**
 * 
 * @param {number[]} values 
 * @param {number[]} types 
 */
function buildTreeFromArray(values, types) {
    const root = new Node(0);
    let current = root; 
    const parents = [];

    let valIndex = 0;
    for (let i = 1; i < types.length; i++) {
        const node = new Node(0);
        if (!types[i]) {
            parents.push(node);
        } else {
            node.ch = values[valIndex++];
        }

        if (!current.left) {
            current.left = node;
        } else if (!current.right) {
            current.right = node;
            current = parents.shift();
        }
    }

    return root;
}

function testDecodeWithTree(root, bits, bytes) {
    let index = 0;

    let cur = root;

    const decoded = [];

    console.log('# mask     wMask    byte     Tree path');
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        const str3 = byte.toString(2);
        const padded3 = '0'.repeat(8 - str3.length) + str3;

        for (let j = 7; j >= 0 && index < bits; j--, index++) {
            const mask = 1 << j;
            const str = mask.toString(2);
            const padded = '0'.repeat(8 - str.length) + str;

            const masked = byte & mask;

            const str2 = masked.toString(2);
            const padded2 = '0'.repeat(8-str2.length) + str2;

            const bit = masked > 0 ? 1 : 0;

            // Go right
            if (masked > 0) {
                cur = cur.right;
            }
            // Go left
            else {
                cur = cur.left;
            }

            if (cur.left == null && cur.right == null) {
                decoded.push(cur.ch);
                cur = root;

                console.log(j, padded, padded2, padded3, bit, '<- leaf');
            } else {
                console.log(j, padded, padded2, padded3, bit);
            }
        }

        console.log();
    }

    console.log("Decoded string:");
    console.log(decoded);
}

/**
 * 
 * @param {Buffer} buffer 
 */
function buildHuffmanTree(buffer) {
    const freqMap = new Map();

    for (let i = 0; i < buffer.length; ++i) {
        const byte = buffer[i];
        if (!(byte in freqMap)) {
            freqMap[byte] = 0;
        }

        freqMap[byte] = freqMap[byte] + 1;
    }

    const q = new PriorityQueue({ 
        /**
         * 
         * @param {Node} a
         * @param {Node} b 
         * @returns 
         */
        comparator: function(left, right) { 
            return left.freq - right.freq;
        }
    });

    for (const key of Object.keys(freqMap)) {
        const value = freqMap[key];

        q.queue(new Node(parseInt(key), value));
    }
    
    while (q.length > 1) {
        const left = q.dequeue();
        const right = q.dequeue();

        const sum = left.freq + right.freq;

        q.queue(new Node(0, sum, left, right));
    }

    const root = q.peek();

    console.log('Built a graph:');
    const d = printNode(root);
    console.log('Max depth:', (d-1));

    const huffmanCode = new Map();
    encode(root, "", huffmanCode);

    console.log('\nHuffman codes:');
    for (const key of Object.keys(huffmanCode)) {
        console.log(huffmanCode[key], '=', key);
    }

    console.log("\nEncodeDecode tree test");
    console.log('Encoding BFS');

    const encodedGraph = encodeGraphIteratively(root);

    console.log(encodedGraph);

    const decodedGraph = buildTreeFromArray(encodedGraph.values, encodedGraph.types);

    console.log('Decoded Graph:');
    printNode(decodedGraph);

    console.log("\nOriginal buffer: [", buffer.join(', '), ']');
    console.log('size=', buffer.byteLength << 3, 'bits');

    let encoded = '';

    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        encoded += huffmanCode[byte];
    }

    const bits = encoded.length;
    const shouldBeBits = Math.round((bits + 7) >> 3) << 3;
    const endZerosLen = shouldBeBits - bits;

    console.log("Encoded string:", encoded, '; size=', bits,'bits','to fit in octets=',shouldBeBits,'compression coefficient=',Math.round((buffer.length<<3)/shouldBeBits*100)/100);
    
    encoded += '0'.repeat(endZerosLen);
    const encodedBytes = encoded.match(/.{1,8}/g).map(e=>parseInt(e, 2));

    console.log('Result BitLen:', bits, ', bytes:', encodedBytes);

    console.log('\n===== Traversing bits');
    testDecodeWithTree(root, bits, encodedBytes);
}

const binaryData = Buffer.from('aabcceeeefff');

buildHuffmanTree(binaryData);