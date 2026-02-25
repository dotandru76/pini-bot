/**
 * engine/jobTicket.js - Production Routing & Job Preparation
 */

const ROUTING_RULES = {
    flyer: "OFFSET_PRESS_HEIDELBERG",
    business_cards: "DIGITAL_PRESS_XEROX_V180",
    poster: "UV_FLATBED_RICOH",
    rollup: "WIDE_FORMAT_EPSON",
    sticker: "DIE_CUT_ROLAND"
};

/**
 * Deterministically routes a validated order item to its production machine.
 */
function routeProduction(orderItem) {
    const product = orderItem.product;
    const machine = ROUTING_RULES[product] || "GENERAL_DIGITAL_PRINT";

    return {
        ...orderItem,
        production_routing: machine,
        pre_flight_status: "AUTO_PASSED"
    };
}

module.exports = {
    routeProduction
};
