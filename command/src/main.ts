import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { execSync } from 'child_process';
import { format } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const superagent = require('superagent');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobe = require('ffprobe');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStatic = require('ffprobe-static');

let cmd = '';
let state = 'COMPLETED';
let filepath = '';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const appService = app.get(AppService);

  try {
    let res;
    res = await superagent.get('http://192.168.7.171:3000/jobs/queue');
    console.log(res.body.filepath);

    filepath = '//192.168.7.176/' + res.body.filepath;

    console.log('main:' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));

    state = 'RUNNING';
    res = await superagent
      .patch('http://192.168.7.171:3000/jobs/' + res.body.id)
      .send({
        state: state,
        beginAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      });

    await encord(filepath);

    let completed = false;
    if (state === 'COMPLETED') {
      completed = true;
    } else {
      state = 'ABORT';
    }

    res = await superagent
      .patch('http://192.168.7.171:3000/jobs/' + res.body.id)
      .send({
        state: state,
        command: cmd,
        completed: completed,
        finishAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      });

    console.log('main: update.');
  } catch (err) {
    console.error(err);
  }

  console.log(appService.getHello());
}

function encord(filepath: string): Promise<string> {
  return new Promise((resolve) => {
    console.log('encord: begin');

    ffprobe(filepath, { path: ffprobeStatic.path })
      .then(function (info) {
        cmd = '';
        const filename = path.basename(filepath.replace('.m2ts', '.ts'), '.ts');
        console.log('filename:' + filename);

        console.log('width:' + info.streams[0].width);
        console.log('height:' + info.streams[0].height);
        let resize = '';
        let qp = '';

        switch (info.streams[0].width) {
          case 1440:
            resize = '-resize 960x720';
            qp = '-qp 22';
            break;
          case 1920:
            resize = '-resize 1280x720';
            qp = '-qp 25';
            break;
          default:
            resize =
              '-resize ' + info.streams[0].width + 'x' + info.streams[0].height;
            qp = '-qp 25';
            break;
        }

        const ffmpeg = 'c:/ffmpeg/bin/ffmpeg.exe';
        const outputPath = '//192.168.7.176/tank/40_enc/';

        cmd =
          ffmpeg +
          ' -y -hwaccel cuda -hwaccel_output_format cuda' +
          ' -c:v mpeg2_cuvid -deint 2 -drop_second_field 1 ' +
          resize +
          ' -i "' +
          filepath +
          '" -c:v h264_nvenc -profile:v high -g 150 -b_ref_mode 0 ' +
          qp +
          ' -c:a copy "' +
          outputPath +
          filename +
          '.mp4"';

        console.log('cmd: ' + cmd);
        resolve(cmd);

        let result;
        try {
          result = execSync(cmd);
          console.log(`stdout: ${result}`);
          state = 'COMPLETED';
          console.log('encord: finish');
        } catch (ex) {
          console.log(`stderr: ${ex.stdout}`);
        }

        // exec(cmd, (err, stdout, stderr) => {
        //   if (err) {
        //     console.log(`stderr: ${stderr}`);
        //     return;
        //   }
        //   console.log(`stdout: ${stdout}`);
        //   state = 'COMPLETED';
        //   console.log('encord: finish');
        // });
      })
      .catch(function (err) {
        console.error(err);
      });
  });
}

bootstrap();
