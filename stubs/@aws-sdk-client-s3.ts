export class S3Client {
  constructor(_config: any) {}
  send() {
    return Promise.resolve({});
  }
}

export const PutObjectCommand = function (args: any) {
  return args;
};
