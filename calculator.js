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
		return toMeters(parseFloat($("#giant_m_input").val()), parseFloat($("#giant_cm_input").val()));
	} else {
		return toFeet(parseFloat($("#giant_ft_input").val()), parseFloat($("#giant_in_input").val()));
	}
}

function getViewerHeight(useMetric) {
	if (useMetric) {
		return toMeters(parseFloat($("#human_m_input").val()), parseFloat($("#human_cm_input").val()));
	} else {
		return toFeet(parseFloat($("#human_ft_input").val()), parseFloat($("#human_in_input").val()));
	}
}

function toMeters(meters, centimeters) {
	return meters + centimeters/100.0
}

function toFeet(feet, inches) {
	return feet + inches/12.0
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

function formatFeet(f) {
  if (f >= 100) {
    const feet = Math.round(f);
    return `${feet} ft`;
  } else if (f >= 1 && f < 100) {
    const feet = Math.floor(f);
    const inches = Math.round((f - feet) * 12);
    const feetString = feet > 0 ? `${feet} ft` : '';
    const inchesString = inches > 0 ? `${inches} in` : '';
    return feetString + (feetString && inchesString ? ' ' : '') + inchesString;
  } else if (f >= 1 / 12 && f < 1) {
    const inches = (f * 12).toFixed(1);
    return `${parseFloat(inches)} in`;
  } else {
    const inches = (f * 12).toPrecision(2);
    return `${parseFloat(inches)} in`;
  }
}

function formatMeters(m) {
  if (m >= 1 && m < 1000) {
    const meters = Math.floor(m);
    const centimeters = Math.round((m - meters) * 100);
    const metersString = meters > 0 ? `${meters} m` : '';
    const centimetersString = centimeters > 0 ? `${centimeters} cm` : '';
    return metersString + (metersString && centimetersString ? ' ' : '') + centimetersString;
  } else if (m >= 1000 && m < 10000) {
    const kilometers = (m / 1000).toFixed(2);
    return `${parseFloat(kilometers)} km`;
  } else if (m >= 10000 && m < 100000) {
    const kilometers = (m / 1000).toFixed(1);
    return `${parseFloat(kilometers)} km`;
  } else if (m >= 100000) {
    const kilometers = Math.round(m / 1000);
    return `${kilometers} km`;
  } else if (m >= 0.1 && m < 1) {
    const centimeters = (m * 100).toFixed(1);
    return `${parseFloat(centimeters)} cm`;
  } else {
    const millimeters = (m * 1000).toPrecision(2);
    return `${parseFloat(millimeters)} mm`;
  }
}

function formatInt(x) {
	return Math.round(x)
}

function formatUnit(x, base) {
	// Assumes x is in the "larger" units (ie ft or m)
	let biggerUnit = Math.floor(x)
	let smallerUnit = Math.round((x%1)*base)
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
			let size = formatFeet(dimension['size'])
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
				newLength = formatMeters(newLength)
			} else {
				newLength = formatFeet(newLength)
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