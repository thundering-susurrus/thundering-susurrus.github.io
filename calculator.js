function computeGiantWeight(useMetric) {
	let viewerHeight = getViewerHeight(useMetric)
	let characterHeight = getCharacterHeight(useMetric)
	let heightRatio = characterHeight / viewerHeight
	let humanWeight
	if (useMetric) {
		humanWeight = parseFloat($("#kgs_input").val());
	} else {
		humanWeight = parseFloat($("#lbs_input").val());
	}
	return humanWeight * (heightRatio ** 3);
}

function getCharacterHeight(useMetric) {
	if (useMetric) {
		return toCm(parseFloat($("#giant_m_input").val()), parseFloat($("#giant_cm_input").val()));
	} else {
		return toInches(parseFloat($("#giant_ft_input").val()), parseFloat($("#giant_in_input").val()));
	}
}

function getViewerHeight(useMetric) {
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

function computeLength(baseLength, baseHeight, characterHeight, viewerHeight, useRelative) {
	let heightRatio
	if (useRelative) {
		heightRatio = characterHeight / viewerHeight;
	} else {
		heightRatio = characterHeight / baseHeight;
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

function formatUnit(x, base) {
	// Assumes x is in the "smaller" units (ie in or cm)
	let biggerUnit = Math.floor(x/base)
	let smallerUnit = Math.round(x % base)
	return [biggerUnit, smallerUnit]
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
	getViewerHeight(useMetric)
}

function updateRelHeight(characterHeight, viewerHeight, useMetric, baseHeight) {
	let heightRatio = characterHeight / viewerHeight
	if (useMetric) {
		let baseHeightCm = baseHeight * 2.54
		let relHeight = heightRatio * baseHeightCm
		let [m, cm] = formatUnit(relHeight, 100)
		$("#giant_m_rel").val(m)
		$("#giant_cm_rel").val(cm)
	} else {
		let relHeight = heightRatio * baseHeight
		let [ft, inch] = formatUnit(relHeight, 12)
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
	let characterHeight = getCharacterHeight(useMetric)
	let viewerHeight = getViewerHeight(useMetric)
	let baseHeight = myData['base_height']

	for (const [table_name, dimensions] of Object.entries(myData['tables'])) {
		for (dimension of dimensions) {
			let name = dimension['name']
			let baseLength = dimension['size']
			let newLength = computeLength(baseLength, baseHeight, characterHeight, viewerHeight, useRelative)
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
	updateRelHeight(characterHeight, viewerHeight, useMetric, baseHeight)
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