import { t } from "i18next"
import React from "react"
import { Manager } from "../../../../lib/furnisystems-sdk/modules/customer/types"
import { formatPhoneForDisplay, formatToE164 } from "../../../../lib/util/phone"

interface ManagerProfileCardProps {
  manager: Manager
  languages?: string[]
}

// Flag components for languages
const UkrainianFlag = () => (
  <div className="w-6 h-6 relative bg-white rounded-full overflow-hidden">
    <div className="w-10 h-6 left-0 top-0 absolute bg-blue-600">
      <div className="w-10 h-3 left-0 top-3 absolute bg-yellow-300"></div>
    </div>
  </div>
)

const LithuanianFlag = () => (
  <div className="w-6 h-6 relative bg-white rounded-3xl overflow-hidden">
    <div className="w-10 h-6 left-0 top-0 absolute bg-yellow-300 rounded-sm overflow-hidden">
      <div className="w-10 h-2 left-0 top-2 absolute bg-lime-600"></div>
      <div className="w-10 h-2 left-0 top-4 absolute bg-rose-500"></div>
    </div>
  </div>
)

const ManagerProfileCard = ({
  manager,
  languages = ["UA", "LT"],
}: ManagerProfileCardProps) => {
  const fullName = `${manager.name} ${manager.surname}`
  const imageUrl = manager.image?.src || manager.image?.src_md
  console.log("Manager Profile Card Rendered", {
    manager,
    imageUrl,
    hasImage: !!manager.image,
  })

  const phone = manager.default_phone_number || ""
  const renderFlag = (lang: string) => {
    switch (lang) {
      case "UA":
        return <UkrainianFlag />
      case "LT":
        return <LithuanianFlag />
      default:
        return (
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-700">{lang}</span>
          </div>
        )
    }
  }

  return (
    <div className="h-[400px] sm:h-[484px] relative bg-white overflow-hidden rounded-lg">
      <div className="w-full h-28 sm:h-36 left-0 top-0 absolute bg-beige-20">
        <img
          className="w-full h-28 sm:h-36 left-0 top-0 absolute"
          src="/images/account_profile_banner.png"
          alt="Background"
        />
        <div className="w-20 h-20 sm:w-28 sm:h-28 top-[70px] sm:top-[90px] left-1/2 -translate-x-1/2 absolute rounded-[66.67px] border-[1.20px] border-white overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fullName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm sm:text-lg font-medium">
              {fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </div>
          )}
        </div>
      </div>
      <div className="top-[170px] sm:top-[226px] w-full absolute inline-flex flex-col justify-start items-start gap-6 sm:gap-10">
        <div className="self-stretch flex flex-col justify-center items-center gap-2">
          <div className="self-stretch text-center justify-start text-dark-blue-70 text-xs sm:text-sm font-normal font-sans uppercase leading-snug tracking-[2.80px]">
            {t("manager")}
          </div>
          <div className="self-stretch text-center justify-start text-dark-blue text-lg sm:text-xl font-medium font-sans leading-7 sm:leading-9 px-2">
            {fullName}
          </div>
        </div>
        <div className="self-stretch flex flex-col justify-start items-start gap-4 sm:gap-6 px-4 sm:px-6">
          <div className="self-stretch inline-flex justify-between items-center">
            <div className="text-justify justify-start text-dark-blue-70 text-sm sm:text-base font-normal font-sans leading-normal">
              {t("email")}
            </div>
            <div className="justify-start text-dark-blue text-sm sm:text-base font-medium font-sans uppercase leading-normal text-right">
              {manager.email}
            </div>
          </div>
          <div className="self-stretch inline-flex justify-between items-center">
            <div className="text-justify justify-start text-dark-blue-70 text-sm sm:text-base font-normal font-sans leading-normal">
              {t("phone")}
            </div>
            <div className="justify-start text-dark-blue text-sm sm:text-base font-medium font-sans leading-normal">
              {formatPhoneForDisplay(phone)}
            </div>
          </div>
          <div className="self-stretch inline-flex justify-between items-start">
            <div className="text-justify justify-start text-dark-blue-70 text-sm sm:text-base font-normal font-sans leading-normal">
              {t("languages", { count: languages.length })}
            </div>
            <div className="flex justify-start items-start gap-2">
              {languages.map((lang, index) => (
                <div key={index}>{renderFlag(lang)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManagerProfileCard
