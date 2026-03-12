-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'waiting';

-- AlterTable
ALTER TABLE "HelpReply" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "HelpTicket" ADD COLUMN     "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentAcctName" TEXT,
ADD COLUMN     "paymentBankAcct" TEXT,
ADD COLUMN     "paymentBankName" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentMomoNumber" TEXT,
ADD COLUMN     "paymentMomoProvider" TEXT;

-- CreateTable
CREATE TABLE "OrderMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminPaymentSetting" (
    "id" TEXT NOT NULL,
    "settingType" TEXT NOT NULL,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankAcctName" TEXT,
    "momoProvider" TEXT,
    "momoNumber" TEXT,
    "momoAcctName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPaymentSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPaymentSetting_settingType_key" ON "AdminPaymentSetting"("settingType");

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderMessage" ADD CONSTRAINT "OrderMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
