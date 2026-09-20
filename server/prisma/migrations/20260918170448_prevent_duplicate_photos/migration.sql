/*
  Warnings:

  - A unique constraint covering the columns `[eventId,uploaderId,filename,fileSize]` on the table `Photo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Photo_eventId_uploaderId_filename_fileSize_key" ON "Photo"("eventId", "uploaderId", "filename", "fileSize");
