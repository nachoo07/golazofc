import { useState, useEffect } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import "../calendar/calendarReport.css";

const CalendarReport = ({ onMonthChange }) => {

  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentDate(new Date()), 86400000);
    return () => clearInterval(interval);
  }, []);

  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentDay = currentDate.getDate();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleSelectMonth = (index) => {
    if (selectedYear < currentYear || (selectedYear === currentYear && index <= currentMonth)) {
      setSelectedMonth(index);
      onMonthChange(new Date(selectedYear, index)); // Llamar a la función de callback
    }
  };

  const handlePrevYear = () => {
    setSelectedYear(selectedYear - 1);
  };

  const handleNextYear = () => {
    if (selectedYear < currentYear) setSelectedYear(selectedYear + 1);
  };

  const handleToday = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setIsOpen(false);
    onMonthChange(new Date(currentYear, currentMonth)); // Llamar a la función de callback
  };

  const startDay = 1;
  const endDay =
    selectedMonth === currentMonth && selectedYear === currentYear
      ? currentDay
      : getDaysInMonth(selectedYear, selectedMonth);

  return (
    <div className="calendar-container">
      <button className="calendar-toggle" onClick={() => setIsOpen(!isOpen)}>
        <FaCalendarAlt />
        <span>
          Resumen <strong>{startDay} {monthNames[selectedMonth]} {selectedYear}</strong> a{" "}
          <strong>{endDay} {monthNames[selectedMonth]} {selectedYear}</strong>
        </span>
      </button>
      {isOpen && (
        <div className="calendar-popup">
          <div className="calendar-header">
            <button onClick={handlePrevYear}>{"<"}</button>
            <span>{selectedYear}</span>
            <button onClick={handleNextYear}>{">"}</button>
          </div>
          <div className="calendar-months">
            {monthNames.map((month, index) => (
              <button
                key={index}
                className={`month-btn ${selectedMonth === index ? "selected" : ""}`}
                style={{
                  color:
                    selectedYear < currentYear || index <= currentMonth
                      ? "#000"
                      : "#ccc",
                  pointerEvents:
                    selectedYear < currentYear || index <= currentMonth
                      ? "auto"
                      : "none",
                }}
                onClick={() => handleSelectMonth(index)}
              >
                {month}
              </button>
            ))}
          </div>
          <div className="calendar-actions">
            <button className="today-btn" onClick={handleToday}>Hoy</button>
            <button className="close-btn" onClick={() => setIsOpen(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarReport