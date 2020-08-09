function computeWeight() {
	let humanWeight = parseInt($("#lbs_input").val());
	let humanHeight = toInches(parseInt($("#human_ft_input").val()), parseInt($("#human_in_input").val()));
	let giantHeight = toInches(parseInt($("#giant_ft_input").val()), parseInt($("#giant_in_input").val()));
	let heightRatio = giantHeight / humanHeight;
	return humanWeight * (heightRatio ** 3);
}

function computeLength(baseLength, baseHeight, giantHeight) {
	let heightRatio = giantHeight / baseHeight;
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

function formatInt(x) {
	return Math.round(x)
}

function partToId(dimension) {
	let formatted_part;
	if ("id" in dimension) {
		formatted_part = dimension['id']
	}
	else {
		formatted_part = dimension['name'].replace(" ", "_")
	}
	return "body_part_" + formatted_part + "_elt"
}

function toInches(feet, inches) {
	return 12.0 * feet + inches
}

function buildDimensions(myData) {
	let table_data_pairs = [
		[myData['dimensions'], '#body_parts_table'],
		[myData['face_dimensions'], '#facial_features_table']
	]
	for (pair of table_data_pairs) {
		let dimensions, table;
		[dimensions, table] = pair;
		for (dimension of dimensions) {
			let name = dimension['name']
			let size = formatInches(dimension['size'])
			let input_id = partToId(dimension)
			let htmlString = '<tr><td>' + name + '</td><td id=\"' + input_id + '\">' + size + '</td></tr>'
			$(table).append(htmlString)
		}
	}
	updateDimensions(myData)
}

function updateDimensions(myData) {
	let giantHeight = toInches(parseInt($("#giant_ft_input").val()), parseInt($("#giant_in_input").val()));
	let giantWeight = computeWeight()
	$("#giant_lbs").val(formatInt(giantWeight))

	let dimensions_sets = [myData['dimensions'], myData['face_dimensions']]
	let baseHeight = myData['base_height']

	for (dimension_set of dimensions_sets) {
		for (dimension of dimension_set) {
			let name = dimension['name']
			let baseLength = dimension['size']
			let newLength = computeLength(baseLength, baseHeight, giantHeight)
			newLength = formatInches(newLength)
			let input_id = partToId(dimension)
			$("#" + input_id).text(newLength)
		}
	}
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

	// instructions
	$('[data-toggle="collapse"]').click(function() {
		$(this).toggleClass("active");
		if ($(this).hasClass("active")) {
			$(this).text("Hide Instructions");
		} else {
			$(this).text("Show Instructions");
		}
	});
})