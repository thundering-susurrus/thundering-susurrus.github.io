function computeGiantWeight(useMetric) {
	let humanHeight = getHumanHeight(useMetric)
	let giantHeight = getGiantHeight(useMetric)
	let heightRatio = giantHeight / humanHeight
	let humanWeight
	if (useMetric) {
		humanWeight = parseFloat($("#kgs_input").val());
	} else {
		humanWeight = parseFloat($("#lbs_input").val());
	}
	return humanWeight * (heightRatio ** 3);
}

function getGiantHeight(useMetric) {
	if (useMetric) {
		return toCm(parseFloat($("#giant_m_input").val()), parseFloat($("#giant_cm_input").val()));
	} else {
		return toInches(parseFloat($("#giant_ft_input").val()), parseFloat($("#giant_in_input").val()));
	}
}

function getHumanHeight(useMetric) {
	if (useMetric) {
		return toCm(parseFloat($("#human_m_input").val()), parseFloat($("#human_cm_input").val()));
	} else {
		return toInches(parseFloat($("#human_ft_input").val()), parseFloat($("#human_in_input").val()));
	}
}

function toCm(meters, centimeters) {
	return meters * 100.0 + centimeters
}

function toInches(feet, inches) {
	return 12.0 * feet + inches
}

function computeLength(baseLength, baseHeight, giantHeight, humanHeight, useRelative) {
	let heightRatio
	if (useRelative) {
		heightRatio = giantHeight / humanHeight;
	} else {
		heightRatio = giantHeight / baseHeight;
	}
	return baseLength * heightRatio;
}

function formatInches(x) {
	let feet = Math.floor(x / 12)
	let inches = (x % 12).toFixed(2).replace(/\.?0*$/, "")
	let finalString = ""
	if (feet != 0) {
		finalString += feet + " ft"
	}
	if ((inches != "0") && (feet != 0)) {
		finalString += " "
	}
	if (inches != "0") {
		finalString += inches + " in"
	}
	return finalString
}

function formatCm(x) {
	let meters = Math.floor(x / 100)
	let centimeters = Math.round(x % 100).toString()
	let finalString = ""
	if (meters != 0) {
		finalString += meters + " m"
	}
	if ((centimeters != "0") && (meters != 0)) {
		finalString += " "
	}
	if (centimeters != "0") {
		finalString += centimeters + " cm"
	}
	return finalString
}

function formatInt(x) {
	return Math.round(x)
}

function partToId(dimension) {
	let formatted_part;
	if ("id" in dimension) {
		formatted_part = dimension['id']
	} else {
		formatted_part = dimension['name'].replace(" ", "_")
	}
	return "body_part_" + formatted_part + "_elt"
}

function buildDimensions(myData) {
	// Run once on startup
	for (const [table_name, dimensions] of Object.entries(myData['tables'])) {
		for (dimension of dimensions) {
			let name = dimension['name']
			let size = formatInches(dimension['size'])
			let input_id = partToId(dimension)
			let htmlString = '<tr><td>' + name + '</td><td id=\"' + input_id + '\">' + size + '</td></tr>'
			$("#" + table_name + "_table").append(htmlString)
		}
	}

	updateDimensions(myData)
}

function swapUnits(useMetric) {
	if (useMetric) {
		$(".imperial").hide()
		$(".metric").show()
	} else {
		$(".imperial").show()
		$(".metric").hide()
	}
}

function swapPerspective(useRelative) {
	if (useRelative) {
		$(".relative").show()
		$(".absolute").hide()
	} else {
		$(".relative").hide()
		$(".absolute").show()
	}
}

function getPerspectiveHeightRatio() {
	getHumanHeight(useMetric)

}

function updateRelHeight(giantHeight, humanHeight, useMetric) {
	let heightRatio = giantHeight / humanHeight
	if (useMetric) {
		let relHeight = heightRatio * 183
		let m = formatInt(relHeight / 100.0)
		let cm = formatInt(relHeight % 100)
		$("#giant_m_rel").val(m)
		$("#giant_cm_rel").val(cm)
	} else {
		let relHeight = heightRatio * (6 * 12)
		let ft = formatInt(relHeight / 12.0)
		let inch = formatInt(relHeight % 12)
		$("#giant_ft_rel").val(ft)
		$("#giant_in_rel").val(inch)
	}
}

function updateDimensions(myData) {
	let useMetric = $("input[name=unitsRadio]:checked").val() == "metric"
	let useRelative = $("input[name=modeRadio]:checked").val() == "relative"

	// Toggle settings
	swapUnits(useMetric)
	swapPerspective(useRelative)

	// Get and set weight
	let giantWeight = computeGiantWeight(useMetric)
	if (useMetric) {
		$("#giant_kgs").val(formatInt(giantWeight))
	} else {
		$("#giant_lbs").val(formatInt(giantWeight))
	}

	// Update lengths
	let giantHeight = getGiantHeight(useMetric)
	let humanHeight = getHumanHeight(useMetric)
	let baseHeight = myData['base_height']

	for (const [table_name, dimensions] of Object.entries(myData['tables'])) {
		for (dimension of dimensions) {
			let name = dimension['name']
			let baseLength = dimension['size']
			let newLength = computeLength(baseLength, baseHeight, giantHeight, humanHeight, useRelative)
			if (useMetric) {
				newLength = formatCm(newLength)
			} else {
				newLength = formatInches(newLength)
			}
			let input_id = partToId(dimension)
			$("#" + input_id).text(newLength)
		}
	}

	// Update relative height
	updateRelHeight(giantHeight, humanHeight, useMetric)
}

// Runs on start
$(document).ready(function() {
	$.getJSON("data.json", buildDimensions).done(
		function(myData) {
			$("input").change(function() {
				updateDimensions(myData)
			});
		}
	)
	// prevent non-numeric entry
	$("input").keypress(function(e) {
		if (
			e.key.length === 1 && e.key !== '.' && isNaN(e.key) && !e.ctrlKey ||
			e.key === '.' && e.target.value.toString().indexOf('.') > -1
		) {
			e.preventDefault();
		}
	})
})