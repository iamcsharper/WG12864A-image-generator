/**
 * Converts any video to a sequence of black and white 128x64-sized png images
 * @license MIT
 * @author Yurchenko Ilya
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs'
import { exec } from 'child_process';
import yargs from 'yargs'

const argv = yargs(process.argv.slice(2))
    .usage('Usage: $0 <command> [options]')
    .example('$0 framify -f in.mp4 -offset 4 -invert true', '# convert the given file to PNG frames')
    .alias('f', 'file')
    .alias('i', 'invert')
    .alias('fps', 'fps')
    .alias('o', 'offset')
    .alias('d', 'duration')
    .alias('s', 'size')
    .command('convert', 'Process video and extract PNG frames')
    .string('f')
        .describe('f', 'Load a file')
        .number('offset')
        .number('duration')
        .number('fps')
        .string('size')
        .demandOption(['f', 'o'])
    .demandCommand()
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2021')
    .argv;

const invertColors = argv.invert;

const initTimeOffset = argv.offset || 0;
const fps = argv.fps || 10;
const duration = argv.duration || 9;
const size = argv.size || '128x64';
const inputFile = argv.file || './badapple.mp4';

const frameCount = Math.ceil(fps * duration);
const area = size.split('x').map(e=>parseInt(e)).reduce((p, v) => p * v);
const bytes = area / 8;

console.log('[Debug] Calculated info');
console.log('Total pixel count:', area);
console.log('Frame count will be:', frameCount);
console.log('Frame size:', bytes / 1024, 'kB');
console.log('Total frames size:', bytes * frameCount / 1024, 'kB');

let command = ffmpeg(inputFile)
    .noAudio()
    .output('result.mp4')
    .seekInput(initTimeOffset)
    .takeFrames(frameCount)
    .fpsOutput(fps)
    .videoFilters('hue=s=0')
    .videoFilters('unsharp=luma_msize_x=7:luma_msize_y=7:luma_amount=2.5')
    .size(size)
    .on('progress', (progress) => {
        console.log('Scaling: ' + (progress.percent||0) + '% done');
    })
    .on('end', () => {
        console.log('Scaling done. Thresholding!');
        fs.rmSync('./thr.mp4', {force: true});
        fs.rmdirSync('./frames', {recursive: true});

        if (fs.existsSync('./frames/')) {
            const files = fs.readdirSync('./frames/');
            for (const file of files) {
                fs.rmSync('./frames/' + file, { force: true });
            }
        }

        exec('ffmpeg -i result.mp4 -f lavfi -i color=gray:s=128x64 -f lavfi -i color=black:s=128x64 -f lavfi -i color=white:s=128x64 -filter_complex threshold thr.mp4', 
        {
            cwd: process.cwd()
        }, () => {
            setTimeout(()=> {
                console.log('Thresholding done. Framing!');

                ffmpeg('./thr.mp4')
                    .takeFrames(frameCount)
                    .on('end', () => {
                        console.log('Framified!');
                    })
                    .save('frames/%03d.png');
            }, 200);
        });
    });

if (invertColors)
    command = command.videoFilters('negate');
    
command.run(); 