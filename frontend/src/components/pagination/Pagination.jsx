import "./Pagination.css";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  showNumbers = true,
  showSummary = false,
  prevLabel = "«",
  nextLabel = "»",
  hideIfSinglePage = false,
  className = "",
  buttonClassName = "pagination-btn",
  activeClassName = "active",
  maxVisiblePages = 7,
}) => {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeTotalPages);

  if (hideIfSinglePage && safeTotalPages <= 1) {
    return null;
  }

  const changePage = (targetPage) => {
    if (disabled || typeof onPageChange !== "function") {
      return;
    }
    const boundedPage = Math.min(Math.max(1, targetPage), safeTotalPages);
    if (boundedPage !== safeCurrentPage) {
      onPageChange(boundedPage);
    }
  };

  const getVisiblePages = () => {
    if (!showNumbers) {
      return [];
    }

    const safeMaxVisible = Math.max(5, Number(maxVisiblePages) || 7);

    if (safeTotalPages <= safeMaxVisible) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    const middleSlots = safeMaxVisible - 2;
    const half = Math.floor(middleSlots / 2);

    let start = Math.max(2, safeCurrentPage - half);
    let end = Math.min(safeTotalPages - 1, safeCurrentPage + half);

    const currentRange = end - start + 1;
    if (currentRange < middleSlots) {
      const missing = middleSlots - currentRange;
      start = Math.max(2, start - missing);
      end = Math.min(safeTotalPages - 1, end + missing);
    }

    const result = [1];

    if (start > 2) {
      result.push("ellipsis-left");
    }

    for (let page = start; page <= end; page += 1) {
      result.push(page);
    }

    if (end < safeTotalPages - 1) {
      result.push("ellipsis-right");
    }

    result.push(safeTotalPages);
    return result;
  };

  const pages = getVisiblePages();

  return (
    <div className={`pagination ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled || safeCurrentPage === 1}
        onClick={() => changePage(safeCurrentPage - 1)}
        className={buttonClassName}
      >
        {prevLabel}
      </button>

      {showNumbers &&
        pages.map((page, index) => {
          if (typeof page !== "number") {
            return (
              <span key={`${page}-${index}`} className="pagination-ellipsis" aria-hidden="true">
                …
              </span>
            );
          }
          return (
            <button
              type="button"
              key={page}
              disabled={disabled}
              className={`${buttonClassName} ${safeCurrentPage === page ? activeClassName : ""}`.trim()}
              onClick={() => changePage(page)}
            >
              {page}
            </button>
          );
        })}
      {showSummary && <span className="pagination-summary">Página {safeCurrentPage} de {safeTotalPages}</span>}
      <button
        type="button"
        disabled={disabled || safeCurrentPage === safeTotalPages}
        onClick={() => changePage(safeCurrentPage + 1)}
        className={buttonClassName}
      >
        {nextLabel}
      </button>
    </div>
  );
};

export default Pagination;