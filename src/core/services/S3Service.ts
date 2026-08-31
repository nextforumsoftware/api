import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import { s3Client, bucketName, objectUrl } from "../../config/awsConfig";
import { HttpException } from "../exceptions/HttpException";

type UploadParams = {
  key: string;
  contentType: string;
  buffer: Buffer;
};

const EXPIRACAO_PADRAO_EM_SEGUNDOS = 86400;

export const S3Service = {

  async upload({ key, contentType, buffer }: UploadParams): Promise<{ key: string, url: string }> {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        },
      });

      await upload.done();

      return { key, url: objectUrl(key) };
    } catch (error) {
      console.error(`Falha ao enviar ${key} para o S3`, error);
      throw new HttpException(500, "Erro ao fazer upload do arquivo");
    }
  },

  async get(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);

      return {
        key,
        body: response.Body,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
      };
    } catch (error: any) {
      if (error?.name === "NoSuchKey" || error?.name === "NotFound") {
        throw new HttpException(404, "Arquivo não encontrado");
      }

      console.error(`Falha ao buscar ${key} no S3`, error);
      throw new HttpException(500, "Erro ao buscar arquivo");
    }
  },

  async getPresignedUrl(key: string, expiresIn = EXPIRACAO_PADRAO_EM_SEGUNDOS): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  },

  async remove(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error(`Falha ao excluir ${key} do S3`, error);
      throw new HttpException(500, "Erro ao excluir arquivo");
    }
  },
};
