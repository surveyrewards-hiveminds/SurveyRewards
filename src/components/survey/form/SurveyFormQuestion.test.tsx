import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SurveyFormQuestion } from "../SurveyFormQuestion";
import { SurveyOptionEntity } from "../../../../types/survey";

// Mock the Text component
jest.mock("../../../language/Text", () => ({
  Text: ({ tid }: { tid: string }) => <span>{tid}</span>,
}));

// Mock the LinearScaleSlider component
jest.mock("../LinearScaleSlider", () => ({
  LinearScaleSlider: () => <div>LinearScaleSlider</div>,
}));

describe("SurveyFormQuestion - Other Option", () => {
  const mockOptions: SurveyOptionEntity[] = [
    { id: "1", question_id: "q1", value: "Option 1" },
    { id: "2", question_id: "q1", value: "Option 2" },
  ];

  describe("Radio Questions with Other Option", () => {
    it('should render "Other" option when allow_other is true', () => {
      render(
        <SurveyFormQuestion
          question="Test radio question"
          type="radio"
          options={mockOptions}
          allow_other={true}
          value=""
          onChange={() => {}}
        />
      );

      expect(
        screen.getByText("questionBuilder.otherOption")
      ).toBeInTheDocument();
    });

    it('should not render "Other" option when allow_other is false', () => {
      render(
        <SurveyFormQuestion
          question="Test radio question"
          type="radio"
          options={mockOptions}
          allow_other={false}
          value=""
          onChange={() => {}}
        />
      );

      expect(
        screen.queryByText("questionBuilder.otherOption")
      ).not.toBeInTheDocument();
    });

    it('should show text input when "Other" is selected', () => {
      const mockOnChange = jest.fn();

      render(
        <SurveyFormQuestion
          question="Test radio question"
          type="radio"
          options={mockOptions}
          allow_other={true}
          value={{ isOther: true, otherText: "Custom answer" }}
          onChange={mockOnChange}
        />
      );

      const textInput = screen.getByDisplayValue("Custom answer");
      expect(textInput).toBeInTheDocument();

      fireEvent.change(textInput, {
        target: { value: "Updated custom answer" },
      });
      expect(mockOnChange).toHaveBeenCalledWith({
        isOther: true,
        otherText: "Updated custom answer",
      });
    });
  });

  describe("Checkbox Questions with Other Option", () => {
    it('should render "Other" option when allow_other is true', () => {
      render(
        <SurveyFormQuestion
          question="Test checkbox question"
          type="checkbox"
          options={mockOptions}
          allow_other={true}
          value={{ values: [] }}
          onChange={() => {}}
        />
      );

      expect(
        screen.getByText("questionBuilder.otherOption")
      ).toBeInTheDocument();
    });

    it('should show text input when "Other" checkbox is checked', () => {
      const mockOnChange = jest.fn();

      render(
        <SurveyFormQuestion
          question="Test checkbox question"
          type="checkbox"
          options={mockOptions}
          allow_other={true}
          value={{
            values: ["1"],
            otherData: { isSelected: true, text: "Custom checkbox answer" },
          }}
          onChange={mockOnChange}
        />
      );

      const textInput = screen.getByDisplayValue("Custom checkbox answer");
      expect(textInput).toBeInTheDocument();
    });
  });

  describe("Select Questions with Other Option", () => {
    it('should include "Other" option in dropdown when allow_other is true', () => {
      render(
        <SurveyFormQuestion
          question="Test select question"
          type="select"
          options={mockOptions}
          allow_other={true}
          value=""
          onChange={() => {}}
        />
      );

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      // Check that the other option is present
      const otherOption = screen.getByText("questionBuilder.otherOption");
      expect(otherOption).toBeInTheDocument();
    });

    it('should show text input when "Other" is selected in dropdown', () => {
      render(
        <SurveyFormQuestion
          question="Test select question"
          type="select"
          options={mockOptions}
          allow_other={true}
          value={{ isOther: true, otherText: "Custom select answer" }}
          onChange={() => {}}
        />
      );

      const textInput = screen.getByDisplayValue("Custom select answer");
      expect(textInput).toBeInTheDocument();
    });
  });

  describe("Questions without Other Option", () => {
    it('should not render "Other" option for text questions', () => {
      render(
        <SurveyFormQuestion
          question="Test text question"
          type="text"
          options={[]}
          allow_other={true}
          value=""
          onChange={() => {}}
        />
      );

      expect(
        screen.queryByText("questionBuilder.otherOption")
      ).not.toBeInTheDocument();
    });
  });
});
