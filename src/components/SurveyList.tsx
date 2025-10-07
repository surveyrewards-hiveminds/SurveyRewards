import React from "react";
import type { Survey } from "../types/survey";

interface SurveyListProps {
  surveys: Survey[];
  type: "answer" | "question";
}

export default function SurveyList({ surveys, type }: SurveyListProps) {
  return (
    <div className="bg-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Questionnaire list</h2>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-2">No.</th>
            <th className="text-left p-2">Questionnaire name</th>
            <th className="text-left p-2">
              {type === "answer" ? "Reward" : "situation"}
            </th>
            <th className="text-right p-2"></th>
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey, index) => (
            <tr key={survey.id} className="bg-white">
              <td className="p-2">{index + 1}.</td>
              <td className="p-2">{survey.name}</td>
              <td className="p-2">
                {type === "answer" ? survey.reward : survey.status}
              </td>
              <td className="p-2 text-right">
                <button className="bg-[#020B2C] text-white px-4 py-1 rounded">
                  {type === "answer" ? "Answer" : "Edit"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-right mt-4">
        <button className="bg-[#020B2C] text-white px-4 py-2 rounded">
          View more
        </button>
      </div>
    </div>
  );
}
