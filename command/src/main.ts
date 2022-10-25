import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { exec } from 'child_process';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const superagent = require('superagent');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobe = require('ffprobe');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeStatic = require('ffprobe-static');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const appService = app.get(AppService);

  // promise with async/await
  (async () => {
    try {
      const res = await superagent.get('http://localhost:3000/jobs/queue');
      console.log(res.body.filepath);

      const filepath = '//192.168.7.176/' + res.body.filepath;

      const filename = path.basename(filepath.replace('.m2ts', '.ts'), '.ts');
      console.log('filename:' + filename);

      ffprobe(filepath, { path: ffprobeStatic.path })
        .then(function (info) {
          // console.log(info);

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
                '-resize ' +
                info.streams[0].width +
                'x' +
                info.streams[0].height;
              qp = '-qp 25';
              break;
          }

          const ffmpeg = 'c:/ffmpeg/bin/ffmpeg.exe';
          // const outputPath = 'c:/temp/';
          const outputPath = '//192.168.7.176/tank/40_enc/';

          const cmd =
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

          exec(cmd, (err, stdout, stderr) => {
            if (err) {
              console.log(`stderr: ${stderr}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
          });
        })
        .catch(function (err) {
          console.error(err);
        });
    } catch (err) {
      console.error(err);
    }
  })();

  console.log(appService.getHello());
}
bootstrap();
