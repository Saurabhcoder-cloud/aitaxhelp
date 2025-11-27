'use client';

import { useState } from 'react';

interface MailingAddressInfoProps {
  selectedState: string;
}

const stateMailingAddresses: { [key: string]: { name: string; address: string } } = {
  AL: { name: "Alabama Department of Revenue", address: "Individual and Corporate Tax Division, P.O. Box 327480, Montgomery, AL 36132-7480" },
  AK: { name: "Alaska Department of Revenue", address: "No state income tax - no filing required" },
  AZ: { name: "Arizona Department of Revenue", address: "P.O. Box 52016, Phoenix, AZ 85072-2016" },
  AR: { name: "Arkansas Department of Finance", address: "P.O. Box 1272, Little Rock, AR 72203-1272" },
  CA: { name: "California Franchise Tax Board", address: "P.O. Box 942840, Sacramento, CA 94240-0001" },
  CO: { name: "Colorado Department of Revenue", address: "Denver, CO 80261-0005" },
  CT: { name: "Connecticut Department of Revenue", address: "State of Connecticut, Hartford, CT 06104-2976" },
  DE: { name: "Delaware Division of Revenue", address: "P.O. Box 508, Wilmington, DE 19899-0508" },
  FL: { name: "Florida Department of Revenue", address: "No state income tax - no filing required" },
  GA: { name: "Georgia Department of Revenue", address: "P.O. Box 740380, Atlanta, GA 30374-0380" },
  HI: { name: "Hawaii Department of Taxation", address: "P.O. Box 3559, Honolulu, HI 96811-3559" },
  ID: { name: "Idaho State Tax Commission", address: "P.O. Box 56, Boise, ID 83756-0056" },
  IL: { name: "Illinois Department of Revenue", address: "P.O. Box 19044, Springfield, IL 62794-9044" },
  IN: { name: "Indiana Department of Revenue", address: "P.O. Box 7207, Indianapolis, IN 46207-7207" },
  IA: { name: "Iowa Department of Revenue", address: "P.O. Box 10457, Des Moines, IA 50306-0457" },
  KS: { name: "Kansas Department of Revenue", address: "915 SW Harrison St., Topeka, KS 66612-1588" },
  KY: { name: "Kentucky Department of Revenue", address: "P.O. Box 181, Frankfort, KY 40602-0181" },
  LA: { name: "Louisiana Department of Revenue", address: "P.O. Box 3440, Baton Rouge, LA 70821-3440" },
  ME: { name: "Maine Revenue Services", address: "P.O. Box 9107, Augusta, ME 04332-9107" },
  MD: { name: "Comptroller of Maryland", address: "110 Carroll Street, Annapolis, MD 21411-0001" },
  MA: { name: "Massachusetts Department of Revenue", address: "P.O. Box 7000, Boston, MA 02204-7000" },
  MI: { name: "Michigan Department of Treasury", address: "P.O. Box 30774, Lansing, MI 48909-8274" },
  MN: { name: "Minnesota Department of Revenue", address: "Mail Station 0010, St. Paul, MN 55145-0010" },
  MS: { name: "Mississippi Department of Revenue", address: "P.O. Box 23050, Jackson, MS 39225-3050" },
  MO: { name: "Missouri Department of Revenue", address: "P.O. Box 3300, Jefferson City, MO 65105-3300" },
  MT: { name: "Montana Department of Revenue", address: "P.O. Box 5805, Helena, MT 59604-5805" },
  NE: { name: "Nebraska Department of Revenue", address: "P.O. Box 98903, Lincoln, NE 68509-8903" },
  NV: { name: "Nevada Department of Taxation", address: "No state income tax - no filing required" },
  NH: { name: "New Hampshire Department of Revenue", address: "No earned income tax - limited filing required" },
  NJ: { name: "New Jersey Division of Taxation", address: "P.O. Box 281, Trenton, NJ 08695-0281" },
  NM: { name: "New Mexico Taxation and Revenue", address: "P.O. Box 25127, Santa Fe, NM 87504-5127" },
  NY: { name: "New York State Department of Taxation", address: "P.O. Box 61000, Albany, NY 12261-0001" },
  NC: { name: "North Carolina Department of Revenue", address: "P.O. Box 25000, Raleigh, NC 27640-0640" },
  ND: { name: "North Dakota Office of State Tax Commissioner", address: "600 E Boulevard Ave, Bismarck, ND 58505-0599" },
  OH: { name: "Ohio Department of Taxation", address: "P.O. Box 2057, Columbus, OH 43216-2057" },
  OK: { name: "Oklahoma Tax Commission", address: "P.O. Box 26800, Oklahoma City, OK 73126-0800" },
  OR: { name: "Oregon Department of Revenue", address: "P.O. Box 14555, Salem, OR 97309-0940" },
  PA: { name: "Pennsylvania Department of Revenue", address: "P.O. Box 280507, Harrisburg, PA 17128-0507" },
  RI: { name: "Rhode Island Division of Taxation", address: "One Capitol Hill, Providence, RI 02908-5800" },
  SC: { name: "South Carolina Department of Revenue", address: "P.O. Box 125, Columbia, SC 29214-0400" },
  SD: { name: "South Dakota Department of Revenue", address: "No state income tax - no filing required" },
  TN: { name: "Tennessee Department of Revenue", address: "No state income tax - no filing required" },
  TX: { name: "Texas Comptroller of Public Accounts", address: "No state income tax - no filing required" },
  UT: { name: "Utah State Tax Commission", address: "210 N 1950 W, Salt Lake City, UT 84134-0266" },
  VT: { name: "Vermont Department of Taxes", address: "P.O. Box 1881, Montpelier, VT 05601-1881" },
  VA: { name: "Virginia Department of Taxation", address: "P.O. Box 1115, Richmond, VA 23218-1115" },
  WA: { name: "Washington Department of Revenue", address: "No state income tax - no filing required" },
  WV: { name: "West Virginia State Tax Department", address: "P.O. Box 3784, Charleston, WV 25337-3784" },
  WI: { name: "Wisconsin Department of Revenue", address: "P.O. Box 59, Madison, WI 53785-0001" },
  WY: { name: "Wyoming Department of Revenue", address: "No state income tax - no filing required" }
};

const irsMailingAddresses: { [key: string]: string } = {
  AL: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  AK: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  AZ: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  AR: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  CA: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  CO: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  CT: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  DE: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  FL: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  GA: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  HI: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  ID: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  IL: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  IN: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  IA: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  KS: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  KY: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  LA: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  ME: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MD: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MA: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MI: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MN: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MS: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  MO: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  MT: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  NE: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  NV: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  NH: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  NJ: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  NM: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  NY: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  NC: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  ND: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  OH: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  OK: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  OR: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  PA: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  RI: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  SC: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  SD: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  TN: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  TX: "Department of the Treasury, Internal Revenue Service, Austin, TX 73301-0002",
  UT: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  VT: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  VA: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  WA: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002",
  WV: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  WI: "Department of the Treasury, Internal Revenue Service, Kansas City, MO 64999-0002",
  WY: "Department of the Treasury, Internal Revenue Service, Fresno, CA 93888-0002"
};

export default function MailingAddressInfo({ selectedState }: MailingAddressInfoProps) {
  const stateInfo = stateMailingAddresses[selectedState];
  const irsAddress = irsMailingAddresses[selectedState];

  if (!selectedState) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
        <div className="flex items-start">
          <i className="ri-information-line text-yellow-600 text-xl mr-3 mt-1"></i>
          <div>
            <h5 className="font-semibold text-gray-900 mb-2">Select Your State</h5>
            <p className="text-gray-700 text-sm">
              Please select your state of residence to view the correct mailing addresses for your tax returns.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <i className="ri-mail-send-line mr-3 text-blue-600"></i>
        Tax Return Mailing Addresses
      </h3>

      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <i className="ri-government-line mr-2 text-blue-600"></i>
            Federal Tax Return (IRS)
          </h4>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-700 font-medium mb-2">Mail your federal tax return to:</p>
            <p className="text-gray-900 font-mono text-sm leading-relaxed">{irsAddress}</p>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            <i className="ri-information-line mr-1"></i>
            This is the IRS processing center for residents of {selectedState}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <i className="ri-map-pin-line mr-2 text-green-600"></i>
            State Tax Return ({selectedState})
          </h4>
          <div className="bg-white rounded-lg p-4">
            <p className="text-gray-700 font-medium mb-2">{stateInfo.name}</p>
            <p className="text-gray-900 font-mono text-sm leading-relaxed">{stateInfo.address}</p>
          </div>
          {stateInfo.address.includes("No state income tax") && (
            <p className="text-sm text-green-700 mt-3 font-medium">
              <i className="ri-checkbox-circle-line mr-1"></i>
              {selectedState} does not require a state income tax return
            </p>
          )}
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
          <div className="flex items-start">
            <i className="ri-alert-line text-yellow-600 text-xl mr-3 mt-1"></i>
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">Important: Verify Before Mailing</h5>
              <p className="text-gray-700 text-sm mb-3">
                After completing your tax return, please verify these mailing addresses on the official government websites before sending your return:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-yellow-600 mr-2 mt-1"></i>
                  <span><strong>IRS:</strong> Visit <a href="https://www.irs.gov" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.irs.gov</a> to confirm the current federal mailing address</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-yellow-600 mr-2 mt-1"></i>
                  <span><strong>State:</strong> Visit your state's official tax authority website to confirm the current state mailing address</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-checkbox-circle-fill text-yellow-600 mr-2 mt-1"></i>
                  <span>Mailing addresses may change based on whether you're including a payment, requesting a refund, or filing an amended return</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
            <i className="ri-lightbulb-line mr-2 text-blue-600"></i>
            Mailing Tips
          </h5>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <i className="ri-arrow-right-s-line text-blue-600 mr-2 mt-1"></i>
              <span>Use certified mail with return receipt for proof of filing</span>
            </li>
            <li className="flex items-start">
              <i className="ri-arrow-right-s-line text-blue-600 mr-2 mt-1"></i>
              <span>Keep copies of all documents you mail</span>
            </li>
            <li className="flex items-start">
              <i className="ri-arrow-right-s-line text-blue-600 mr-2 mt-1"></i>
              <span>Mail early to ensure timely delivery by the April 15 deadline</span>
            </li>
            <li className="flex items-start">
              <i className="ri-arrow-right-s-line text-blue-600 mr-2 mt-1"></i>
              <span>Consider e-filing for faster processing and confirmation</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
