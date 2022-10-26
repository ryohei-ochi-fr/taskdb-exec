import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';


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

  const filepath = 'C:/tank_once/00_録画/録画 暫定 2021/D0002100126憂鬱_00000-#12-#16.mp4';
  // filepath = 'c:/temp/D0002100126_00000.mp4';

  ffprobe(filepath, { path: ffprobeStatic.path }).then((info) => {
    // const filename = path.basename(filepath.replace('.m2ts', '.ts'), '.ts');
    // console.log('filename:' + filename);

    console.log('width:' + info.streams[0].width);
    console.log('height:' + info.streams[0].height);
  });
}

bootstrap();
