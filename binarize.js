/**
 * Converts 128x64 png frames to binary data to store in MCU memory / SD-card
 * @license MIT
 * @author Yurchenko Ilya
 */

import fs from 'fs'
import { PNG } from 'pngjs'

const folder = './frames';
const frames = fs.readdirSync(folder);

/**
 * if Brightness > THR, then consider WHITE
 * @description NOTE: The ffmpeg conversion preserves some grayscale glitches, we have to decide each pixel to be black or white explicitly
 */
const THR = 7;

/**
 * Converts images with selected indicies to two C-styled flat *uint8t* array
 * strings with equal offset between frames (512 bytes)
 * @see animationFrom
 * @see animationTill
 */
const ANIMATION_MODE = 0;
/**
 * Converts a single image to two C-styled uint8t array strings, 512 bytes each
 * @see animationFrom
 * @see animationTill
 */
const ONESHOT_MODE = 1;
/**
 * Converts every frame to two C-styled uint8t array strings, 512 bytes each
 */
const ALL_MODE = 2;

const MODE = ONESHOT_MODE;

/**
 * @see ANIMATION_MODE
 */
const animationFrom = 0;
const animationTill = 5;

/**
 * @see ONESHOT_MODE
 */
const oneshotFrameIdx = 30;

/**
* Reads a PNG image, returns a Promise with inline Buffer color data [R0 G0 B0 A0], ...
* @param {string} path path to the PNG file
* @returns {Promise<Buffer>}
*/
async function loadPng(path) {
	return new Promise((resolve) => {
		fs.createReadStream(folder + '/' + path)
		.pipe(new PNG({
			filterType: 4
		}))
		.on('parsed', function() {
			resolve(this.data);
		});
	});
}

/**
 * Converts PNG data to the WG12864A-like binary format
 * The horizontal space of 128 pixels is divided in two halves.
 * Each half is splitting vertically by 8 (64 pixels / 8 = 8 bytes per column)
 * Each bit in byte identifies the corresponding pixel to be either black or white
 * The encoding order is from the top left corner the right bottom one.
 * @param {string} path 
 * @returns 
 */
async function convertFrame(path) {
	const pixels = await loadPng(path);
	
	const results = [];
	
	for (let halves = 0; halves < 128; halves += 64) {
		let halfResult = [];
		for (let x = halves; x < (halves + 64); ++x) {
			for (let i = 0; i < 8; ++i) {
				let byte = 0;
				
				for (let n = 0; n < 8; ++n) {
					const y = (i << 3) | n;
					const indexInPng = ((y << 7) + x) << 2;
					const color = pixels[indexInPng] > THR ? 0 : 1;
					
					byte |= color << n;
				}
				
				halfResult.push(byte);
			}
		}

		results.push(halfResult);
	}

	return results;
}

/**
 * Prints a C-styled code to store data in MCU memory
 * @param {number[]} first 
 * @param {number[]} second 
 */
function printCode(first, second) {
	console.log(`static uint8_t firstHalf[] = {${first.join(',')}};`);
	console.log();
	console.log(`static uint8_t secondHalf[] = {${second.join(',')}};`);
}

async function run() {
	if (MODE == ANIMATION_MODE) {
		const oneFlat = [];
		const twoFlat = [];

		for (let i = animationFrom; i < animationTill; i++) {
			const [one, two] = await convertFrame(frames[i]);

			oneFlat.push(...one);
			twoFlat.push(...two);
		}

		printCode(oneFlat, twoFlat);
	} else if (MODE == ONESHOT_MODE) {
		const [one, two] = await convertFrame(frames[oneshotFrameIdx]);  

		printCode(one, two);
	} else if (MODE == ALL_MODE) {
		for (let i = 0; i < frames.length; i++) {
			console.log(`# Frame ${i+1}:`)
			const [one, two] = await convertFrame(frames[i]);
			printCode(one, two);
			console.log();
		}
	}
}

run().catch(console.error);