function computeWeight(humanHeight, giantHeight, humanWeight) {
	var heightRatio = giantHeight / humanHeight
	return humanWeight * (heightRatio ** 3)
}

function heightAsFeet(feet, inches) {
	return feet + inches / 12.0
}

function formatInt(x) {
	return Math.round(x)
}

$(document).ready(function() {
	// prevent non-numeric entry
	$("input").keypress(function(e) {
		if (
			e.key.length === 1 && e.key !== '.' && isNaN(e.key) && !e.ctrlKey ||
			e.key === '.' && e.target.value.toString().indexOf('.') > -1
		) {
			e.preventDefault();
		}
	});

	$("input").change(function() {
		// re-compute the resulting weight
		var humanWeight = parseInt($("#lbs_input").val())
		var humanHeight = heightAsFeet(parseInt($("#human_ft_input").val()), parseInt($("#human_in_input").val()))
		var giantHeight = heightAsFeet(parseInt($("#giant_ft_input").val()), parseInt($("#giant_in_input").val()))
		var giantWeight = computeWeight(humanHeight, giantHeight, humanWeight)
		$("#giant_lbs").val(formatInt(giantWeight))
	})
})