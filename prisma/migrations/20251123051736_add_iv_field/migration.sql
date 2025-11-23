/*
  Warnings:

  - Added the required column `iv` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Made the column `signature` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "iv" TEXT NOT NULL,
ALTER COLUMN "signature" SET NOT NULL;
