import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
}

export const createR2Client = (config: R2Config) => {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const putR2Object = async (
  client: S3Client,
  bucket: string,
  key: string,
  body: Uint8Array | Buffer | string,
  contentType?: string,
) => {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
};

export const getR2Object = async (client: S3Client, bucket: string, key: string) => {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

  if (!response.Body) {
    throw new Error("R2 object body missing");
  }

  return response.Body.transformToByteArray();
};
